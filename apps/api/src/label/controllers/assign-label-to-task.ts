import { and, eq } from "drizzle-orm";
import db from "../../database";
import {
  labelTable,
  type labelTable as labelTableType,
  projectTable,
  taskTable,
} from "../../database/schema";
import { publishEvent } from "../../events";
import {
  removeLabelFromGitea,
  syncLabelToGitea,
} from "../../plugins/gitea/utils/sync-label-to-gitea";
import {
  removeLabelFromGitHub,
  syncLabelToGitHub,
} from "../../plugins/github/utils/sync-label-to-github";
import { httpError } from "../../utils/http-error";

type LabelRow = typeof labelTableType.$inferSelect;

async function assignLabelToTask(id: string, taskId: string, userId: string) {
  const label = await db.query.labelTable.findFirst({
    where: (label, { eq }) => eq(label.id, id),
  });

  if (!label) {
    throw httpError(404, "label_not_found", "Label not found");
  }

  const [task] = await db
    .select({
      id: taskTable.id,
      projectId: taskTable.projectId,
      workspaceId: projectTable.workspaceId,
    })
    .from(taskTable)
    .innerJoin(projectTable, eq(taskTable.projectId, projectTable.id))
    .where(eq(taskTable.id, taskId))
    .limit(1);

  if (!task) {
    throw httpError(404, "task_not_found", "Task not found");
  }

  if (label.workspaceId && label.workspaceId !== task.workspaceId) {
    throw httpError(
      400,
      "label_and_task_must_belong_to_the_same_workspace",
      "Label and task must belong to the same workspace",
    );
  }

  if (label.taskId === taskId) {
    return label;
  }

  type InsertionResult = {
    taskLabel: LabelRow;
    inserted: boolean;
    previousTaskId: string | null;
    previousName: string;
  };
  const { taskLabel, inserted, previousTaskId, previousName } =
    await db.transaction<InsertionResult>(async (tx) => {
      const currentLabel = await tx.query.labelTable.findFirst({
        where: (label, { eq }) => eq(label.id, id),
      });

      if (!currentLabel) {
        throw httpError(404, "label_not_found", "Label not found");
      }

      if (
        currentLabel.workspaceId &&
        currentLabel.workspaceId !== task.workspaceId
      ) {
        throw httpError(
          400,
          "label_and_task_must_belong_to_the_same_workspace",
          "Label and task must belong to the same workspace",
        );
      }

      if (currentLabel.taskId === taskId) {
        return {
          taskLabel: currentLabel,
          inserted: false,
          previousTaskId: null,
          previousName: currentLabel.name,
        };
      }

      const previousTaskId = currentLabel.taskId;
      if (previousTaskId) {
        await tx.delete(labelTable).where(eq(labelTable.id, id));
      }

      const [insertedRow] = await tx
        .insert(labelTable)
        .values({
          name: currentLabel.name,
          color: currentLabel.color,
          taskId,
          workspaceId: task.workspaceId,
        })
        .onConflictDoNothing({
          target: [labelTable.taskId, labelTable.name],
        })
        .returning();

      if (insertedRow) {
        return {
          taskLabel: insertedRow,
          inserted: true,
          previousTaskId,
          previousName: currentLabel.name,
        };
      }

      const existing = await tx.query.labelTable.findFirst({
        where: and(
          eq(labelTable.taskId, taskId),
          eq(labelTable.name, currentLabel.name),
        ),
      });

      if (!existing) {
        throw httpError(
          500,
          "failed_to_attach_label_to_task",
          "Failed to attach label to task",
        );
      }

      return {
        taskLabel: existing,
        inserted: false,
        previousTaskId,
        previousName: currentLabel.name,
      };
    });

  if (previousTaskId) {
    removeLabelFromGitHub(previousTaskId, previousName).catch((error) => {
      console.error("Failed to remove label from GitHub:", error);
    });
    removeLabelFromGitea(previousTaskId, previousName).catch((error) => {
      console.error("Failed to remove label from Gitea:", error);
    });
  }

  if (!inserted) {
    return taskLabel;
  }

  syncLabelToGitHub(taskId, taskLabel.name, taskLabel.color).catch((error) => {
    console.error("Failed to sync label to GitHub:", error);
  });
  syncLabelToGitea(taskId, taskLabel.name, taskLabel.color).catch((error) => {
    console.error("Failed to sync label to Gitea:", error);
  });

  await publishEvent("task.label_assigned", {
    label: taskLabel,
    task,
    projectId: task.projectId,
    taskId: task.id,
    userId,
    type: "label_assigned",
  });

  return taskLabel;
}

export default assignLabelToTask;
