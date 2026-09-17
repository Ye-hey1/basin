import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import db, { schema } from "../../apps/api/src/database";
import { createApp } from "../../apps/api/src/index";
import { mockAuthenticatedSession } from "./helpers/auth";
import { resetTestDatabase } from "./helpers/database";
import {
  createProjectFixture,
  createWorkspaceMember,
} from "./helpers/fixtures";

type App = ReturnType<typeof createApp>["app"];

async function createRequirement(app: App, workspaceId: string, title: string) {
  const response = await app.request("/api/requirement", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ workspaceId, title }),
  });
  expect(response.status).toBe(200);
  return (await response.json()) as { id: string };
}

async function createTask(
  app: App,
  projectId: string,
  title: string,
  extra: Record<string, unknown> = {},
) {
  const response = await app.request(`/api/task/${projectId}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      title,
      description: "",
      priority: "medium",
      status: "to-do",
      ...extra,
    }),
  });
  expect(response.status).toBe(200);
  return (await response.json()) as {
    id: string;
    requirementId: string | null;
  };
}

async function linkTask(
  app: App,
  taskId: string,
  requirementId: string | null,
) {
  return app.request(`/api/task/requirement/${taskId}`, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ requirementId }),
  });
}

describe("API integration: task ↔ requirement link", () => {
  beforeEach(async () => {
    await resetTestDatabase();
  });

  it("links a task to a requirement and reports it back", async () => {
    const member = await createWorkspaceMember({ role: "member" });
    mockAuthenticatedSession(member.user);
    const { app } = createApp();
    const { project } = await createProjectFixture({
      workspaceId: member.workspace.id,
    });

    const requirement = await createRequirement(
      app,
      member.workspace.id,
      "Deliver the link",
    );
    const task = await createTask(app, project.id, "Implement it");

    const response = await linkTask(app, task.id, requirement.id);
    expect(response.status).toBe(200);

    const linked = (await response.json()) as { requirementId: string | null };
    expect(linked.requirementId).toBe(requirement.id);

    // Detail route resolves the title so the task view needs no second call.
    const detailResponse = await app.request(`/api/task/${task.id}`);
    expect(detailResponse.status).toBe(200);
    const detail = (await detailResponse.json()) as {
      requirementId: string | null;
      requirementTitle: string | null;
    };
    expect(detail.requirementId).toBe(requirement.id);
    expect(detail.requirementTitle).toBe("Deliver the link");
  });

  it("lists the linked task on the requirement and counts it", async () => {
    const member = await createWorkspaceMember({ role: "member" });
    mockAuthenticatedSession(member.user);
    const { app } = createApp();
    const { project, columns } = await createProjectFixture({
      workspaceId: member.workspace.id,
    });

    const requirement = await createRequirement(
      app,
      member.workspace.id,
      "With tasks",
    );
    const task = await createTask(app, project.id, "Linked task");
    const doneTask = await createTask(app, project.id, "Finished task", {
      status: columns.done.slug,
    });

    await linkTask(app, task.id, requirement.id);
    await linkTask(app, doneTask.id, requirement.id);

    const tasksResponse = await app.request(
      `/api/requirement/${requirement.id}/tasks?workspaceId=${member.workspace.id}`,
    );
    expect(tasksResponse.status).toBe(200);

    const tasks = (await tasksResponse.json()) as Array<{
      id: string;
      projectName: string;
      isFinal: boolean;
    }>;
    expect(tasks).toHaveLength(2);
    expect(tasks.map((row) => row.id).sort()).toEqual(
      [task.id, doneTask.id].sort(),
    );
    expect(tasks.find((row) => row.id === doneTask.id)?.isFinal).toBe(true);
    expect(tasks.find((row) => row.id === task.id)?.isFinal).toBe(false);

    const detailResponse = await app.request(
      `/api/requirement/${requirement.id}?workspaceId=${member.workspace.id}`,
    );
    const detail = (await detailResponse.json()) as {
      taskCounts: { total: number; done: number };
    };
    expect(detail.taskCounts).toEqual({ total: 2, done: 1 });
  });

  it("refuses a requirement from another workspace", async () => {
    const member = await createWorkspaceMember({ role: "admin" });
    const other = await createWorkspaceMember({ role: "admin" });

    mockAuthenticatedSession(member.user);
    const { app } = createApp();
    const { project } = await createProjectFixture({
      workspaceId: member.workspace.id,
    });

    const foreign = await db
      .insert(schema.requirementTable)
      .values({ workspaceId: other.workspace.id, title: "Foreign requirement" })
      .returning({ id: schema.requirementTable.id });

    const task = await createTask(app, project.id, "Cross-workspace attempt");
    const foreignId = foreign[0]?.id as string;

    // Both the dedicated route and create-with-link must refuse it.
    const linkResponse = await linkTask(app, task.id, foreignId);
    expect(linkResponse.status).toBe(404);

    const createResponse = await app.request(`/api/task/${project.id}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        title: "Sneaky",
        description: "",
        priority: "medium",
        status: "to-do",
        requirementId: foreignId,
      }),
    });
    expect(createResponse.status).toBe(404);

    const persisted = await db.query.taskTable.findFirst({
      where: eq(schema.taskTable.id, task.id),
    });
    expect(persisted?.requirementId).toBeNull();
  });

  it("unlinks instead of deleting the task when its requirement is deleted", async () => {
    const member = await createWorkspaceMember({ role: "admin" });
    mockAuthenticatedSession(member.user);
    const { app } = createApp();
    const { project } = await createProjectFixture({
      workspaceId: member.workspace.id,
    });

    const requirement = await createRequirement(
      app,
      member.workspace.id,
      "Temporary",
    );
    const task = await createTask(app, project.id, "Survives");
    await linkTask(app, task.id, requirement.id);

    const deleteResponse = await app.request(
      `/api/requirement/${requirement.id}?workspaceId=${member.workspace.id}`,
      { method: "DELETE" },
    );
    expect(deleteResponse.status).toBe(200);

    const surviving = await db.query.taskTable.findFirst({
      where: eq(schema.taskTable.id, task.id),
    });
    expect(surviving).toBeDefined();
    expect(surviving?.requirementId).toBeNull();
  });

  it("filters the project task list by requirement", async () => {
    const member = await createWorkspaceMember({ role: "member" });
    mockAuthenticatedSession(member.user);
    const { app } = createApp();
    const { project } = await createProjectFixture({
      workspaceId: member.workspace.id,
    });

    const requirement = await createRequirement(
      app,
      member.workspace.id,
      "Filter target",
    );
    const linked = await createTask(app, project.id, "In scope");
    await createTask(app, project.id, "Out of scope");
    await linkTask(app, linked.id, requirement.id);
    const response = await app.request(
      `/api/task/tasks/${project.id}?requirementId=${requirement.id}`,
    );
    expect(response.status).toBe(200);

    // The list route returns the board shape: tasks arrive grouped by column,
    // plus the archived and planned buckets.
    const body = (await response.json()) as {
      data: {
        columns: Array<{ tasks: Array<{ id: string }> }>;
        archivedTasks: Array<{ id: string }>;
        plannedTasks: Array<{ id: string }>;
      };
      pagination: { total: number };
    };

    const returned = [
      ...body.data.columns.flatMap((column) => column.tasks),
      ...body.data.archivedTasks,
      ...body.data.plannedTasks,
    ];

    expect(body.pagination.total).toBe(1);
    expect(returned.map((row) => row.id)).toEqual([linked.id]);
  });
});
