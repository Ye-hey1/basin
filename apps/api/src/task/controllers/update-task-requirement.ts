import { eq } from "drizzle-orm";
import db from "../../database";
import { taskTable } from "../../database/schema";
import { publishEvent } from "../../events";
import { getProjectWorkspaceId } from "../../utils/assert-assignable-user";
import { httpError } from "../../utils/http-error";
import { assertRequirementInWorkspace } from "../validate-task-requirement";

/**
 * Links a task to a requirement, or unlinks it when `requirementId` is null.
 *
 * No broadcast subscriber handles `task.requirement_changed` yet — the
 * requirement domain has no realtime channel, so the web client refreshes the
 * affected queries instead. The event is published anyway because every other
 * field mutation on a task does, and a future integration should not have to
 * discover this one by omission.
 */
async function updateTaskRequirement({
  id,
  requirementId,
  currentUserId,
}: {
  id: string;
  requirementId: string | null;
  currentUserId: string;
}) {
  const existingTask = await db.query.taskTable.findFirst({
    where: eq(taskTable.id, id),
  });

  if (!existingTask) {
    throw httpError(404, "task_not_found", "Task not found");
  }

  if (requirementId) {
    await assertRequirementInWorkspace(
      requirementId,
      await getProjectWorkspaceId(existingTask.projectId),
    );
  }

  const [updatedTask] = await db
    .update(taskTable)
    .set({ requirementId })
    .where(eq(taskTable.id, id))
    .returning();

  if (!updatedTask) {
    throw httpError(
      500,
      "failed_to_update_task_requirement",
      "Failed to update task requirement",
    );
  }

  await publishEvent("task.requirement_changed", {
    taskId: updatedTask.id,
    projectId: updatedTask.projectId,
    userId: currentUserId,
    oldRequirementId: existingTask.requirementId,
    newRequirementId: requirementId,
    title: updatedTask.title,
    type: "requirement_changed",
  });

  return updatedTask;
}

export default updateTaskRequirement;
