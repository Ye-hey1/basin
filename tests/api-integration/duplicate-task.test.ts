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

describe("API integration: task duplication", () => {
  beforeEach(async () => {
    await resetTestDatabase();
  });

  it("copies a task with its labels and assignee into the same column", async () => {
    const member = await createWorkspaceMember();
    const { project, columns } = await createProjectFixture({
      workspaceId: member.workspace.id,
    });

    mockAuthenticatedSession(member.user);
    const { app } = createApp();

    // The source task is created through the API rather than inserted by hand.
    // A task's number comes from the project's counter, so a hand-written row
    // would leave that counter behind and the copy would collide with it.
    const createResponse = await app.request(`/api/task/${project.id}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        title: "Original task",
        description: "Copy me",
        priority: "high",
        status: columns.todo.slug,
        userId: member.user.id,
      }),
    });
    expect(createResponse.status).toBe(200);
    const task = await createResponse.json();

    await db.insert(schema.labelTable).values({
      name: "docs",
      color: "#ff0000",
      taskId: task.id,
      workspaceId: member.workspace.id,
    });

    const response = await app.request(`/api/task/${task.id}/duplicate`, {
      method: "POST",
    });

    expect(response.status).toBe(200);
    const duplicated = await response.json();

    expect(duplicated.id).not.toBe(task.id);
    expect(duplicated.title).toBe(`${task.title} (copy)`);
    expect(duplicated.description).toBe("Copy me");
    expect(duplicated.userId).toBe(member.user.id);
    expect(duplicated.columnId).toBe(columns.todo.id);
    expect(duplicated.priority).toBe("high");
    expect(duplicated.number).toBeGreaterThan(task.number);

    const labels = await db
      .select()
      .from(schema.labelTable)
      .where(eq(schema.labelTable.taskId, duplicated.id));
    expect(labels).toHaveLength(1);
    expect(labels[0].name).toBe("docs");
  });

  it("rejects duplication when the task does not exist", async () => {
    const member = await createWorkspaceMember();
    mockAuthenticatedSession(member.user);
    const { app } = createApp();

    const response = await app.request("/api/task/missing-id/duplicate", {
      method: "POST",
    });

    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.code).toBe("task_not_found");
  });
});
