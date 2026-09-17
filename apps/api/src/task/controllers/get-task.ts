import { eq } from "drizzle-orm";
import db from "../../database";
import { requirementTable, taskTable, userTable } from "../../database/schema";
import { httpError } from "../../utils/http-error";

async function getTask(taskId: string) {
  const task = await db
    .select({
      id: taskTable.id,
      title: taskTable.title,
      number: taskTable.number,
      description: taskTable.description,
      status: taskTable.status,
      priority: taskTable.priority,
      startDate: taskTable.startDate,
      dueDate: taskTable.dueDate,
      position: taskTable.position,
      createdAt: taskTable.createdAt,
      userId: taskTable.userId,
      assigneeName: userTable.name,
      assigneeId: userTable.id,
      projectId: taskTable.projectId,
      requirementId: taskTable.requirementId,
      // Resolved here so the task view can name its requirement without a
      // second round trip; null whenever the task is not linked to one.
      requirementTitle: requirementTable.title,
    })
    .from(taskTable)
    .leftJoin(userTable, eq(taskTable.userId, userTable.id))
    .leftJoin(
      requirementTable,
      eq(taskTable.requirementId, requirementTable.id),
    )
    .where(eq(taskTable.id, taskId))
    .limit(1);

  if (!task.length || !task[0]) {
    throw httpError(404, "task_not_found", "Task not found");
  }

  return task[0];
}

export default getTask;
