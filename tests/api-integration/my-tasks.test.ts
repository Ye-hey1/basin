import { beforeEach, describe, expect, it } from "vitest";
import db, { schema } from "../../apps/api/src/database";
import { createApp } from "../../apps/api/src/index";
import { mockAuthenticatedSession } from "./helpers/auth";
import { resetTestDatabase } from "./helpers/database";
import {
  createProjectFixture,
  createWorkspaceMember,
} from "./helpers/fixtures";

describe("API integration: my tasks", () => {
  beforeEach(async () => {
    await resetTestDatabase();
  });

  it("lists only the caller's open tasks across active projects", async () => {
    const member = await createWorkspaceMember();
    const { project, columns } = await createProjectFixture({
      workspaceId: member.workspace.id,
    });

    await db.insert(schema.taskTable).values([
      {
        projectId: project.id,
        userId: member.user.id,
        title: "Mine and open",
        status: columns.todo.name,
        columnId: columns.todo.id,
        priority: "medium",
        number: 1,
        position: 1,
      },
      {
        projectId: project.id,
        userId: member.user.id,
        title: "Mine but done",
        status: columns.done.name,
        columnId: columns.done.id,
        priority: "medium",
        number: 2,
        position: 2,
      },
      {
        projectId: project.id,
        userId: null,
        title: "Unassigned",
        status: columns.todo.name,
        columnId: columns.todo.id,
        priority: "medium",
        number: 3,
        position: 3,
      },
    ]);

    mockAuthenticatedSession(member.user);
    const { app } = createApp();

    const response = await app.request(
      `/api/workspace/${member.workspace.id}/my-tasks`,
    );

    expect(response.status).toBe(200);
    const body = await response.json();

    expect(body).toHaveLength(1);
    expect(body[0]).toMatchObject({
      title: "Mine and open",
      projectId: project.id,
      projectName: project.name,
    });
  });

  it("requires workspace access", async () => {
    const outsider = await createWorkspaceMember();
    const member = await createWorkspaceMember();

    mockAuthenticatedSession(member.user);
    const { app } = createApp();

    const response = await app.request(
      `/api/workspace/${outsider.workspace.id}/my-tasks`,
    );

    expect(response.status).toBe(403);
  });
});
