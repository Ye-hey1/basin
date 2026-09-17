import { and, eq, isNotNull } from "drizzle-orm";
import db from "../../database";
import { labelTable } from "../../database/schema";
import { httpError } from "../../utils/http-error";

async function updateLabel(id: string, name: string, color: string) {
  return db.transaction(async (tx) => {
    const label = await tx.query.labelTable.findFirst({
      where: (label, { eq }) => eq(label.id, id),
    });

    if (!label) {
      throw httpError(404, "label_not_found", "Label not found");
    }

    const [updatedLabel] = await tx
      .update(labelTable)
      .set({ name, color })
      .where(eq(labelTable.id, id))
      .returning();

    // If this is a workspace-level label, cascade the changes to all
    // task-level copies so existing label assignments reflect the new color/name
    if (!label.taskId && label.workspaceId) {
      await tx
        .update(labelTable)
        .set({ name, color })
        .where(
          and(
            eq(labelTable.workspaceId, label.workspaceId),
            eq(labelTable.name, label.name),
            isNotNull(labelTable.taskId),
          ),
        );
    }

    return updatedLabel;
  });
}

export default updateLabel;
