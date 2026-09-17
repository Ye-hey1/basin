import { eq } from "drizzle-orm";
import db, { schema } from "../../database";
import { httpError } from "../../utils/http-error";
import { loadOr404 } from "./get-requirement";

/**
 * Deletes a requirement. A node with children is refused rather than cascaded:
 * silently deleting a whole subtree from a single click is exactly the kind of
 * data loss the workspace boundary is supposed to prevent. Postgres would
 * cascade the delete for us, which is why the check has to happen first.
 */
async function deleteRequirement(id: string) {
  await loadOr404(id);

  const [child] = await db
    .select({ id: schema.requirementTable.id })
    .from(schema.requirementTable)
    .where(eq(schema.requirementTable.parentId, id))
    .limit(1);

  if (child) {
    throw httpError(
      409,
      "requirement_has_children",
      "Move or delete this requirement's sub-requirements first",
    );
  }

  await db
    .delete(schema.requirementTable)
    .where(eq(schema.requirementTable.id, id));

  return { success: true, message: "Requirement deleted" };
}

export default deleteRequirement;
