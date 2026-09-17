import { eq } from "drizzle-orm";
import db from "../../database";
import { timeEntryTable } from "../../database/schema";
import { httpError } from "../../utils/http-error";

async function deleteTimeEntry(timeEntryId: string) {
  const [deleted] = await db
    .delete(timeEntryTable)
    .where(eq(timeEntryTable.id, timeEntryId))
    .returning();

  if (!deleted) {
    throw httpError(404, "time_entry_not_found", "Time entry not found");
  }

  return deleted;
}

export default deleteTimeEntry;
