import { beforeEach, describe, expect, it } from "vitest";
import db, { schema } from "../../apps/api/src/database";
import { createApp } from "../../apps/api/src/index";
import { mockAuthenticatedSession } from "./helpers/auth";
import { resetTestDatabase } from "./helpers/database";
import { createWorkspaceMember } from "./helpers/fixtures";

/**
 * How a request resolves to a workspace is decided by the middleware, which runs
 * before the request validators, so the cases below never reach a controller.
 *
 * `POST /api/activity/create` is the route under test because its workspace
 * source is a task id read from the body, which is the only shape where a looked
 * up id can be absent and fall through to another source.
 */
describe("API integration: workspace access resolution", () => {
  beforeEach(async () => {
    await resetTestDatabase();
  });

  function postCreateActivity(
    app: ReturnType<typeof createApp>["app"],
    body: Record<string, unknown>,
    query = "",
  ) {
    return app.request(`/api/activity/create${query}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  // A request that names nothing resolvable is a bad request, not a missing
  // resource: this is the boundary the 404 path must not swallow.
  it("answers 400 when the request names no resource at all", async () => {
    const member = await createWorkspaceMember();
    mockAuthenticatedSession(member.user);
    const { app } = createApp();

    const response = await postCreateActivity(app, {
      type: "created",
      message: null,
    });

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.code).toBe("workspace_id_could_not_be_determined");
  });

  it("answers 404 with the resource's own code when the named task does not exist", async () => {
    const member = await createWorkspaceMember();
    mockAuthenticatedSession(member.user);
    const { app } = createApp();

    const response = await postCreateActivity(app, {
      taskId: "missing-task",
      type: "created",
      message: null,
    });

    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.code).toBe("task_not_found");
    expect(body.message).toBe("Task not found");
  });

  // A later source that resolves the workspace must win: otherwise naming any
  // unknown id would make the endpoint unusable for callers that pass the
  // workspace explicitly.
  it("lets a resolvable workspace source win over an unresolvable id", async () => {
    const member = await createWorkspaceMember();
    mockAuthenticatedSession(member.user);
    const { app } = createApp();

    const response = await postCreateActivity(
      app,
      { taskId: "missing-task", type: "created", message: null },
      `?workspaceId=${member.workspace.id}`,
    );

    const body = await response.json();
    expect(body.code).not.toBe("workspace_id_could_not_be_determined");
    expect(body.code).not.toBe("task_not_found");
  });

  // The 404 must not become a way to reach a workspace the caller is not in: an
  // id that belongs to someone else still resolves, and is then refused.
  it("refuses an id from a workspace the caller is not a member of", async () => {
    const owner = await createWorkspaceMember();
    const outsider = await createWorkspaceMember();
    const taskId = `task-${owner.user.id}`;
    const { projectTable, taskTable } = schema;

    const [project] = await db
      .insert(projectTable)
      .values({
        workspaceId: owner.workspace.id,
        name: "Private",
        icon: "Folder",
        slug: `private-${owner.user.id}`,
      })
      .returning();

    await db.insert(taskTable).values({
      id: taskId,
      projectId: project.id,
      title: "Someone else's work",
      status: "to-do",
      number: 1,
    });

    mockAuthenticatedSession(outsider.user);
    const { app } = createApp();

    const response = await postCreateActivity(app, {
      taskId,
      type: "created",
      message: null,
    });

    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.code).toBe("you_don_t_have_access_to_this_workspace");
  });
});
