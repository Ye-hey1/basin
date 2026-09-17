import { eq } from "drizzle-orm";
import db from "../../database";
import { timeEntryTable } from "../../database/schema";
import { httpError } from "../../utils/http-error";
import { resolveDuration } from "../duration";

type UpdateTimeEntryParams = {
  timeEntryId: string;
  startTime: Date;
  endTime?: Date;
  description?: string;
};

async function updateTimeEntry(params: UpdateTimeEntryParams) {
  const { timeEntryId, startTime, endTime, description } = params;

  const [existingTimeEntry] = await db
    .select()
    .from(timeEntryTable)
    .where(eq(timeEntryTable.id, timeEntryId));

  if (!existingTimeEntry) {
    throw httpError(404, "time_entry_not_found", "Time entry not found");
  }

  const effectiveEndTime = endTime ?? existingTimeEntry.endTime;

  const duration = resolveDuration(startTime, effectiveEndTime ?? undefined);

  const [updatedTimeEntry] = await db
    .update(timeEntryTable)
    .set({
      startTime,
      endTime: effectiveEndTime,
      duration,
      ...(description !== undefined && { description }),
    })
    .where(eq(timeEntryTable.id, timeEntryId))
    .returning();

  return updatedTimeEntry;
}

export default updateTimeEntry;
