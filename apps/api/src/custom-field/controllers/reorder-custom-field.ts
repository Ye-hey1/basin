import { and, eq } from "drizzle-orm";
import db from "../../database";
import { customFieldDefinitionTable } from "../../database/schema";
import { httpError } from "../../utils/http-error";

async function reorderCustomFields(
  projectId: string,
  customFields: Array<{ id: string; position: number }>,
) {
  await db.transaction(async (tx) => {
    for (const field of customFields) {
      const [updated] = await tx
        .update(customFieldDefinitionTable)
        .set({ position: field.position })
        .where(
          and(
            eq(customFieldDefinitionTable.id, field.id),
            eq(customFieldDefinitionTable.projectId, projectId),
          ),
        )
        .returning({ id: customFieldDefinitionTable.id });

      if (!updated) {
        throw httpError(
          400,
          "custom_field_project_mismatch",
          `Custom field ${field.id} does not belong to this project`,
        );
      }
    }
  });

  const updated = await db.query.customFieldDefinitionTable.findMany({
    where: eq(customFieldDefinitionTable.projectId, projectId),
    orderBy: (columns, { asc }) => [asc(columns.position)],
  });

  return updated;
}

export default reorderCustomFields;
