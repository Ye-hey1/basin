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

describe("API integration: time entry deletion", () => {
  beforeEach(async () => {
    await resetTestDatabase();
  });

  it("deletes a time entry the user can manage", async () => {
    const member = await createWorkspaceMember();
    const { project } = await createProjectFixture({
      workspaceId: member.workspace.id,
    });

    const [task] = await db
      .insert(schema.taskTable)
      .values({
        projectId: project.id,
        title: "Tracked task",
        status: "to-do",
        priority: "medium",
        number: 1,
        position: 1,
      })
      .returning();

    const [entry] = await db
      .insert(schema.timeEntryTable)
      .values({
        taskId: task.id,
        userId: member.user.id,
        startTime: new Date(Date.now() - 60 * 60 * 1000),
        endTime: new Date(),
        duration: 3600,
      })
      .returning();

    mockAuthenticatedSession(member.user);
    const { app } = createApp();

    const response = await app.request(`/api/time-entry/${entry.id}`, {
      method: "DELETE",
    });

    expect(response.status).toBe(200);

    const remaining = await db
      .select()
      .from(schema.timeEntryTable)
      .where(eq(schema.timeEntryTable.id, entry.id));
    expect(remaining).toHaveLength(0);
  });

  it("rejects deletion of a missing entry", async () => {
    const member = await createWorkspaceMember();
    mockAuthenticatedSession(member.user);
    const { app } = createApp();

    const response = await app.request("/api/time-entry/missing-id", {
      method: "DELETE",
    });

    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.code).toBe("time_entry_not_found");
  });
});
