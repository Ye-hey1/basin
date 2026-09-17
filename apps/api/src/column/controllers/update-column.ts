import { eq } from "drizzle-orm";
import db from "../../database";
import { columnTable } from "../../database/schema";
import { httpError } from "../../utils/http-error";

async function updateColumn(
  id: string,
  data: {
    name?: string;
    icon?: string | null;
    color?: string | null;
    isFinal?: boolean;
  },
) {
  const existing = await db.query.columnTable.findFirst({
    where: eq(columnTable.id, id),
  });

  if (!existing) {
    throw httpError(404, "column_not_found", "Column not found");
  }

  const [updated] = await db
    .update(columnTable)
    .set({
      ...(data.name !== undefined && { name: data.name }),
      ...(data.icon !== undefined && { icon: data.icon }),
      ...(data.color !== undefined && { color: data.color }),
      ...(data.isFinal !== undefined && { isFinal: data.isFinal }),
    })
    .where(eq(columnTable.id, id))
    .returning();

  if (!updated) {
    throw httpError(500, "failed_to_update_column", "Failed to update column");
  }

  return updated;
}

export default updateColumn;
