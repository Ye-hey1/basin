import { beforeEach, describe, expect, it } from "vitest";
import db, { schema } from "../../apps/api/src/database";
import { createApp } from "../../apps/api/src/index";
import { mockAuthenticatedSession } from "./helpers/auth";
import { resetTestDatabase } from "./helpers/database";
import {
  createProjectFixture,
  createWorkspaceMember,
} from "./helpers/fixtures";

describe("API integration: workspace overview", () => {
  beforeEach(async () => {
    await resetTestDatabase();
  });

  it("aggregates tasks across the workspace's active projects", async () => {
    const member = await createWorkspaceMember();
    const { project, columns } = await createProjectFixture({
      workspaceId: member.workspace.id,
    });

    await db.insert(schema.taskTable).values([
      {
        projectId: project.id,
        title: "Done task",
        status: columns.done.name,
        columnId: columns.done.id,
        priority: "medium",
        number: 1,
        position: 1,
        userId: member.user.id,
      },
      {
        projectId: project.id,
        title: "Overdue task",
        status: "to-do",
        columnId: columns.todo.id,
        priority: "medium",
        number: 2,
        position: 2,
        userId: member.user.id,
        dueDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
      },
      {
        projectId: project.id,
        title: "Due soon",
        status: "to-do",
        columnId: columns.todo.id,
        priority: "medium",
        number: 3,
        position: 3,
        userId: member.user.id,
        dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    ]);

    mockAuthenticatedSession(member.user);
    const { app } = createApp();

    const response = await app.request(
      `/api/workspace/${member.workspace.id}/overview`,
    );

    expect(response.status).toBe(200);
    const body = await response.json();

    expect(body.totals).toEqual({
      total: 3,
      completed: 1,
      overdue: 1,
      dueSoon: 1,
    });
    expect(body.projects).toEqual([
      expect.objectContaining({
        projectId: project.id,
        name: project.name,
        total: 3,
        completed: 1,
      }),
    ]);
    expect(body.assignees).toEqual([
      expect.objectContaining({
        assigneeId: member.user.id,
        open: 2,
      }),
    ]);
  });

  it("requires workspace access", async () => {
    const outsider = await createWorkspaceMember();
    const { project } = await createProjectFixture({
      workspaceId: outsider.workspace.id,
    });
    await db.insert(schema.taskTable).values({
      projectId: project.id,
      title: "Private task",
      status: "to-do",
      priority: "medium",
      number: 1,
      position: 1,
    });

    const member = await createWorkspaceMember();
    mockAuthenticatedSession(member.user);
    const { app } = createApp();

    const response = await app.request(
      `/api/workspace/${outsider.workspace.id}/overview`,
    );

    expect(response.status).toBe(403);
  });
});
