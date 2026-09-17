import { eq } from "drizzle-orm";
import db, { schema } from "../../database";
import { httpError } from "../../utils/http-error";
import { findRequirement, hydrateRequirements } from "../mappers";

async function loadOr404(id: string) {
  const row = await findRequirement(id);
  if (!row) {
    throw httpError(404, "requirement_not_found", "Requirement not found");
  }
  return row;
}

/** Full detail for one requirement, including its parent's title. */
async function getRequirement(id: string) {
  const requirement = await loadOr404(id);

  const [hydrated] = await hydrateRequirements([requirement]);
  if (!hydrated) {
    throw httpError(404, "requirement_not_found", "Requirement not found");
  }

  let parentTitle: string | null = null;
  if (hydrated.parentId) {
    const [parent] = await db
      .select({ title: schema.requirementTable.title })
      .from(schema.requirementTable)
      .where(eq(schema.requirementTable.id, hydrated.parentId))
      .limit(1);
    parentTitle = parent?.title ?? null;
  }

  return { ...hydrated, parentTitle };
}

export { loadOr404 };
export default getRequirement;
