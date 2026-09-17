import { and, eq } from "drizzle-orm";
import db from "../../database";
import { columnTable } from "../../database/schema";
import { httpError } from "../../utils/http-error";

async function reorderColumns(
  projectId: string,
  columns: Array<{ id: string; position: number }>,
) {
  for (const col of columns) {
    const [updated] = await db
      .update(columnTable)
      .set({ position: col.position })
      .where(
        and(eq(columnTable.id, col.id), eq(columnTable.projectId, projectId)),
      )
      .returning({ id: columnTable.id });

    if (!updated) {
      throw httpError(
        400,
        "column_not_in_project",
        `Column ${col.id} does not belong to this project`,
      );
    }
  }

  const updated = await db.query.columnTable.findMany({
    where: eq(columnTable.projectId, projectId),
    orderBy: (columns, { asc }) => [asc(columns.position)],
  });

  return updated;
}

export default reorderColumns;
