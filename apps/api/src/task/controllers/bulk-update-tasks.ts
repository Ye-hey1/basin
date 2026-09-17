import { and, eq, inArray } from "drizzle-orm";
import db from "../../database";
import {
  columnTable,
  labelTable,
  projectTable,
  taskTable,
  userTable,
  workspaceUserTable,
} from "../../database/schema";
import { publishEvent } from "../../events";
import { removeLabelFromGitea } from "../../plugins/gitea/utils/sync-label-to-gitea";
import { removeLabelFromGitHub } from "../../plugins/github/utils/sync-label-to-github";
import { assertAssignableUser } from "../../utils/assert-assignable-user";
import { httpError } from "../../utils/http-error";
import {
  assertValidPriority,
  assertValidTaskStatus,
} from "../validate-task-fields";

type BulkOperation =
  | "updateStatus"
  | "updatePriority"
  | "updateAssignee"
  | "delete"
  | "addLabel"
  | "removeLabel"
  | "updateDueDate";

async function bulkUpdateTasks({
  taskIds,
  operation,
  value,
  userId,
}: {
  taskIds: string[];
  operation: BulkOperation;
  value?: string | null;
  userId: string;
}) {
  const tasks = await db
    .select({
      id: taskTable.id,
      title: taskTable.title,
      projectId: taskTable.projectId,
      userId: taskTable.userId,
      dueDate: taskTable.dueDate,
      workspaceId: projectTable.workspaceId,
    })
    .from(taskTable)
    .innerJoin(projectTable, eq(taskTable.projectId, projectTable.id))
    .where(inArray(taskTable.id, taskIds));

  if (tasks.length === 0) {
    throw httpError(404, "no_tasks_found", "No tasks found");
  }

  const workspaceIds = [...new Set(tasks.map((t) => t.workspaceId))];

  if (workspaceIds.length > 1) {
    throw httpError(
      400,
      "all_tasks_must_belong_to_the_same_workspace",
      "All tasks must belong to the same workspace",
    );
  }

  const workspaceId = workspaceIds[0];

  if (!workspaceId) {
    throw httpError(
      400,
      "could_not_determine_workspace",
      "Could not determine workspace",
    );
  }

  const [membership] = await db
    .select({ id: workspaceUserTable.id })
    .from(workspaceUserTable)
    .where(
      and(
        eq(workspaceUserTable.userId, userId),
        eq(workspaceUserTable.workspaceId, workspaceId),
      ),
    )
    .limit(1);

  if (!membership) {
    throw httpError(
      403,
      "you_don_t_have_access_to_this_workspace",
      "You don't have access to this workspace",
    );
  }

  const foundIds = tasks.map((t) => t.id);
  let updatedCount = 0;

  switch (operation) {
    case "updateStatus": {
      if (!value) {
        throw httpError(
          400,
          "status_value_is_required",
          "Status value is required",
        );
      }
      const projectIds = [...new Set(tasks.map((t) => t.projectId))];

      for (const projectId of projectIds) {
        await assertValidTaskStatus(value, projectId);

        const column = await db.query.columnTable.findFirst({
          where: and(
            eq(columnTable.projectId, projectId),
            eq(columnTable.slug, value),
          ),
        });

        const projectTaskIds = tasks
          .filter((t) => t.projectId === projectId)
          .map((t) => t.id);

        const result = await db
          .update(taskTable)
          .set({ status: value, columnId: column?.id ?? null })
          .where(inArray(taskTable.id, projectTaskIds));

        updatedCount += result.rowCount ?? projectTaskIds.length;

        for (const taskId of projectTaskIds) {
          await publishEvent("task.status_changed", {
            taskId,
            projectId,
            userId,
            newStatus: value,
            type: "status_changed",
          });
        }

        await publishEvent("task-relation.refresh", {
          projectId,
          userId,
        });
      }
      break;
    }

    case "updatePriority": {
      if (!value) {
        throw httpError(
          400,
          "priority_value_is_required",
          "Priority value is required",
        );
      }
      assertValidPriority(value);

      const result = await db
        .update(taskTable)
        .set({ priority: value })
        .where(inArray(taskTable.id, foundIds));

      updatedCount = result.rowCount ?? foundIds.length;

      for (const task of tasks) {
        await publishEvent("task.priority_changed", {
          taskId: task.id,
          projectId: task.projectId,
          userId,
          newPriority: value,
          type: "priority_changed",
        });
      }
      break;
    }

    case "updateAssignee": {
      const assigneeId = value?.trim() || null;

      if (assigneeId) {
        await assertAssignableUser(assigneeId, workspaceId);
      }

      const newAssigneeName = assigneeId
        ? (
            await db
              .select({ name: userTable.name })
              .from(userTable)
              .where(eq(userTable.id, assigneeId))
              .limit(1)
          )[0]?.name
        : undefined;

      const result = await db
        .update(taskTable)
        .set({ userId: assigneeId })
        .where(inArray(taskTable.id, foundIds));

      updatedCount = result.rowCount ?? foundIds.length;

      for (const task of tasks) {
        const eventType = assigneeId
          ? "task.assignee_changed"
          : "task.unassigned";
        await publishEvent(eventType, {
          taskId: task.id,
          projectId: task.projectId,
          userId,
          oldAssignee: task.userId,
          newAssignee: newAssigneeName,
          newAssigneeId: assigneeId,
          title: task.title,
          type: assigneeId ? "assignee_changed" : "unassigned",
        });
      }
      break;
    }

    case "delete": {
      const result = await db
        .delete(taskTable)
        .where(inArray(taskTable.id, foundIds));

      updatedCount = result.rowCount ?? foundIds.length;

      for (const task of tasks) {
        await publishEvent("task.deleted", {
          taskId: task.id,
          projectId: task.projectId,
          userId,
          title: task.title,
        });
      }
      break;
    }

    case "addLabel": {
      if (!value) {
        throw httpError(400, "label_id_is_required", "Label ID is required");
      }

      const label = await db.query.labelTable.findFirst({
        where: eq(labelTable.id, value),
      });

      if (!label) {
        throw httpError(404, "label_not_found", "Label not found");
      }

      if (label.workspaceId && label.workspaceId !== workspaceId) {
        throw httpError(
          400,
          "label_and_tasks_must_belong_to_the_same_workspace",
          "Label and tasks must belong to the same workspace",
        );
      }

      for (const task of tasks) {
        const existingAssignment = await db.query.labelTable.findFirst({
          where: and(
            eq(labelTable.name, label.name),
            eq(labelTable.taskId, task.id),
          ),
        });

        if (!existingAssignment) {
          await db
            .insert(labelTable)
            .values({
              name: label.name,
              color: label.color,
              workspaceId: workspaceId,
              taskId: task.id,
            })
            .onConflictDoNothing({
              target: [labelTable.taskId, labelTable.name],
            });
          updatedCount++;

          await publishEvent("task.label_assigned", {
            projectId: task.projectId,
            taskId: task.id,
            userId,
            type: "label_assigned",
          });
        }
      }
      break;
    }

    case "removeLabel": {
      if (!value) {
        throw httpError(400, "label_id_is_required", "Label ID is required");
      }

      const label = await db.query.labelTable.findFirst({
        where: eq(labelTable.id, value),
      });

      if (!label) {
        throw httpError(404, "label_not_found", "Label not found");
      }

      const deletedLabels = await db
        .delete(labelTable)
        .where(
          and(
            eq(labelTable.workspaceId, workspaceId),
            eq(labelTable.name, label.name),
            inArray(labelTable.taskId, foundIds),
          ),
        )
        .returning();

      updatedCount = deletedLabels.length;

      for (const deletedLabel of deletedLabels) {
        if (!deletedLabel.taskId) continue;

        removeLabelFromGitHub(deletedLabel.taskId, deletedLabel.name).catch(
          (error) => {
            console.error("Failed to remove label from GitHub:", error);
          },
        );
        removeLabelFromGitea(deletedLabel.taskId, deletedLabel.name).catch(
          (error) => {
            console.error("Failed to remove label from Gitea:", error);
          },
        );

        const task = tasks.find((t) => t.id === deletedLabel.taskId);
        if (!task) continue;

        await publishEvent("task.label_unassigned", {
          label: deletedLabel,
          task,
          projectId: task.projectId,
          taskId: deletedLabel.taskId,
          userId,
          type: "label_unassigned",
        });
      }
      break;
    }

    case "updateDueDate": {
      let parsedDate: Date | null = null;
      if (value) {
        parsedDate = new Date(value);
        if (Number.isNaN(parsedDate.getTime())) {
          throw httpError(
            400,
            "invalid_date_value",
            `Invalid date value "${value}"`,
          );
        }
      }

      const result = await db
        .update(taskTable)
        .set({ dueDate: parsedDate })
        .where(inArray(taskTable.id, foundIds));

      updatedCount = result.rowCount ?? foundIds.length;

      for (const task of tasks) {
        await publishEvent("task.due_date_changed", {
          taskId: task.id,
          projectId: task.projectId,
          userId,
          oldDueDate: task.dueDate,
          newDueDate: parsedDate,
          title: task.title,
          type: "due_date_changed",
        });
      }
      break;
    }

    default: {
      throw httpError(
        400,
        "unknown_bulk_operation",
        `Unknown operation "${operation}"`,
      );
    }
  }

  return { success: true, updatedCount };
}

export default bulkUpdateTasks;
