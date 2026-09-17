import { and, desc, eq, isNull, sql } from "drizzle-orm";
import db from "../../database";
import { columnTable, projectTable, taskTable } from "../../database/schema";

// Open tasks assigned to the current user across the workspace's active
// projects, for the workspace-level "My tasks" view.
async function getMyTasks(workspaceId: string, currentUserId: string) {
  return db
    .select({
      id: taskTable.id,
      projectId: taskTable.projectId,
      projectName: projectTable.name,
      position: taskTable.position,
      number: taskTable.number,
      userId: taskTable.userId,
      title: taskTable.title,
      description: taskTable.description,
      status: taskTable.status,
      priority: taskTable.priority,
      startDate: taskTable.startDate,
      dueDate: taskTable.dueDate,
      createdAt: taskTable.createdAt,
    })
    .from(taskTable)
    .innerJoin(columnTable, eq(taskTable.columnId, columnTable.id))
    .innerJoin(projectTable, eq(taskTable.projectId, projectTable.id))
    .where(
      and(
        eq(projectTable.workspaceId, workspaceId),
        isNull(projectTable.archivedAt),
        eq(taskTable.userId, currentUserId),
        sql`not ${columnTable.isFinal}`,
      ),
    )
    .orderBy(
      // The direction and the null placement have to live in the same fragment.
      // Wrapping this in `asc()` would emit `due_date asc nulls last asc`, which
      // Postgres rejects outright — that was a 500 on this route.
      sql`${taskTable.dueDate} asc nulls last`,
      desc(taskTable.createdAt),
    );
}

export default getMyTasks;
