import { eq } from "drizzle-orm";
import db from "../../database";
import { labelTable, projectTable, taskTable } from "../../database/schema";
import { publishEvent } from "../../events";
import { removeLabelFromGitHub } from "../../plugins/github/utils/sync-label-to-github";
import { httpError } from "../../utils/http-error";

async function unassignLabelFromTask(id: string, userId: string) {
  const label = await db.query.labelTable.findFirst({
    where: (label, { eq }) => eq(label.id, id),
  });

  if (!label) {
    throw httpError(404, "label_not_found", "Label not found");
  }

  if (!label.taskId) {
    throw httpError(
      400,
      "label_is_not_assigned_to_a_task",
      "Label is not assigned to a task",
    );
  }

  const [task] = await db
    .select({
      id: taskTable.id,
      projectId: taskTable.projectId,
      workspaceId: projectTable.workspaceId,
    })
    .from(taskTable)
    .innerJoin(projectTable, eq(taskTable.projectId, projectTable.id))
    .where(eq(taskTable.id, label.taskId))
    .limit(1);

  if (!task) {
    throw httpError(404, "task_not_found", "Task not found");
  }

  const [deletedLabel] = await db
    .delete(labelTable)
    .where(eq(labelTable.id, id))
    .returning();

  if (!deletedLabel) {
    throw httpError(
      500,
      "failed_to_detach_label_from_task",
      "Failed to detach label from task",
    );
  }

  if (deletedLabel.taskId) {
    removeLabelFromGitHub(deletedLabel.taskId, deletedLabel.name).catch(
      (error) => {
        console.error("Failed to remove label from GitHub:", error);
      },
    );
  }

  await publishEvent("task.label_unassigned", {
    label: deletedLabel,
    task,
    projectId: task.projectId,
    taskId: deletedLabel.taskId,
    userId,
    type: "label_unassigned",
  });

  return deletedLabel;
}

export default unassignLabelFromTask;
