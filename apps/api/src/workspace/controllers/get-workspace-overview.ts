import { and, desc, eq, isNull, sql } from "drizzle-orm";
import db from "../../database";
import {
  columnTable,
  projectTable,
  taskTable,
  userTable,
} from "../../database/schema";

// Aggregates over tasks in a workspace's active (non-archived) projects. The
// counts come from the database so task-heavy boards never ship the full task
// list to the client just to render a summary.
async function getWorkspaceOverview(workspaceId: string) {
  const totalsResult = await db
    .select({
      // `count()` is bigint, and node-postgres hands bigint back as a *string*
      // to avoid losing precision. The response schema promises numbers, so
      // every count is cast down to int4 at the source.
      total: sql<number>`count(*)::int`,
      completed: sql<number>`(count(*) filter (where ${columnTable.isFinal}))::int`,
      overdue: sql<number>`(count(*) filter (where ${taskTable.dueDate} < now() and not ${columnTable.isFinal}))::int`,
      dueSoon: sql<number>`(count(*) filter (where ${taskTable.dueDate} >= now() and ${taskTable.dueDate} < now() + interval '7 days' and not ${columnTable.isFinal}))::int`,
    })
    .from(taskTable)
    .innerJoin(columnTable, eq(taskTable.columnId, columnTable.id))
    .innerJoin(projectTable, eq(taskTable.projectId, projectTable.id))
    .where(
      and(
        eq(projectTable.workspaceId, workspaceId),
        isNull(projectTable.archivedAt),
      ),
    );

  // The aggregate always returns exactly one row.
  const totals = totalsResult[0] ?? {
    total: 0,
    completed: 0,
    overdue: 0,
    dueSoon: 0,
  };

  const projects = await db
    .select({
      projectId: projectTable.id,
      name: projectTable.name,
      total: sql<number>`count(${taskTable.id})::int`,
      completed: sql<number>`(count(*) filter (where ${columnTable.isFinal}))::int`,
    })
    .from(projectTable)
    .leftJoin(taskTable, eq(taskTable.projectId, projectTable.id))
    .leftJoin(columnTable, eq(columnTable.id, taskTable.columnId))
    .where(
      and(
        eq(projectTable.workspaceId, workspaceId),
        isNull(projectTable.archivedAt),
      ),
    )
    .groupBy(projectTable.id, projectTable.name)
    .orderBy(projectTable.position);

  const assignees = await db
    .select({
      assigneeId: taskTable.userId,
      name: userTable.name,
      open: sql<number>`count(*)::int`,
    })
    .from(taskTable)
    .innerJoin(columnTable, eq(taskTable.columnId, columnTable.id))
    .innerJoin(projectTable, eq(taskTable.projectId, projectTable.id))
    .innerJoin(userTable, eq(taskTable.userId, userTable.id))
    .where(
      and(
        eq(projectTable.workspaceId, workspaceId),
        isNull(projectTable.archivedAt),
        sql`not ${columnTable.isFinal}`,
      ),
    )
    .groupBy(taskTable.userId, userTable.name)
    .orderBy(desc(sql`count(*)`))
    .limit(5);

  return {
    totals,
    projects,
    assignees: assignees.map(({ assigneeId, ...rest }) => ({
      // The inner join on userTable guarantees a non-null assignee.
      assigneeId: assigneeId ?? "",
      ...rest,
    })),
  };
}

export default getWorkspaceOverview;
