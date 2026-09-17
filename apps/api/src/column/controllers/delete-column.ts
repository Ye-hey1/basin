import { eq, sql } from "drizzle-orm";
import db from "../../database";
import { columnTable, taskTable } from "../../database/schema";
import { httpError } from "../../utils/http-error";

async function deleteColumn(id: string) {
  const existing = await db.query.columnTable.findFirst({
    where: eq(columnTable.id, id),
  });

  if (!existing) {
    throw httpError(404, "column_not_found", "Column not found");
  }

  const [taskCount] = await db
    .select({ count: sql<number>`count(*)` })
    .from(taskTable)
    .where(eq(taskTable.columnId, id));

  if (taskCount && taskCount.count > 0) {
    throw httpError(
      409,
      "cannot_delete_column_that_contains_tasks_move_or_delete_tasks_first",
      "Cannot delete column that contains tasks. Move or delete tasks first.",
    );
  }

  await db.delete(columnTable).where(eq(columnTable.id, id));

  return existing;
}

export default deleteColumn;
