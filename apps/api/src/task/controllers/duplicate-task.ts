import { and, eq, max } from "drizzle-orm";
import db from "../../database";
import {
  labelTable,
  projectTable,
  taskTable,
  userTable,
} from "../../database/schema";
import { publishEvent } from "../../events";
import { httpError } from "../../utils/http-error";
import { claimTaskNumber } from "./claim-task-numbers";

async function duplicateTask({
  taskId,
  currentUserId,
}: {
  taskId: string;
  currentUserId: string;
}) {
  const [source] = await db
    .select({
      task: taskTable,
      workspaceId: projectTable.workspaceId,
    })
    .from(taskTable)
    .innerJoin(projectTable, eq(taskTable.projectId, projectTable.id))
    .where(eq(taskTable.id, taskId));

  if (!source) {
    throw httpError(404, "task_not_found", "Task not found");
  }

  // The copy suffix follows the user's UI language.
  const [user] = await db
    .select({ locale: userTable.locale })
    .from(userTable)
    .where(eq(userTable.id, currentUserId));
  const suffix = user?.locale?.toLowerCase().startsWith("zh")
    ? "（副本）"
    : " (copy)";

  const labels = await db
    .select({ name: labelTable.name, color: labelTable.color })
    .from(labelTable)
    .where(eq(labelTable.taskId, taskId));

  const [maxPositionResult] = await db
    .select({ maxPosition: max(taskTable.position) })
    .from(taskTable)
    .where(
      and(
        eq(taskTable.projectId, source.task.projectId),
        source.task.columnId
          ? eq(taskTable.columnId, source.task.columnId)
          : eq(taskTable.status, source.task.status),
      ),
    );

  const createdTask = await db.transaction(async (tx) => {
    const taskNumber = await claimTaskNumber(source.task.projectId, tx);

    const [task] = await tx
      .insert(taskTable)
      .values({
        projectId: source.task.projectId,
        userId: source.task.userId,
        title: `${source.task.title}${suffix}`,
        status: source.task.status,
        columnId: source.task.columnId,
        startDate: source.task.startDate,
        dueDate: source.task.dueDate,
        description: source.task.description ?? "",
        priority: source.task.priority ?? "no-priority",
        number: taskNumber,
        position: (maxPositionResult?.maxPosition ?? 0) + 1,
      })
      .returning();

    if (!task) {
      throw httpError(500, "failed_to_create_task", "Failed to create task");
    }

    for (const label of labels) {
      await tx.insert(labelTable).values({
        name: label.name,
        color: label.color,
        taskId: task.id,
        workspaceId: source.workspaceId,
      });
    }

    return task;
  });

  if (!createdTask) {
    throw httpError(500, "failed_to_create_task", "Failed to create task");
  }

  await publishEvent("task.created", {
    ...createdTask,
    taskId: createdTask.id,
    userId: createdTask.userId ?? "",
    currentUserId,
    type: "created",
    content: null,
  });

  return createdTask;
}

export default duplicateTask;
