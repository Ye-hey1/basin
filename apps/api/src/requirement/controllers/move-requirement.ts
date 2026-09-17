import { eq } from "drizzle-orm";
import db, { schema } from "../../database";
import { httpError } from "../../utils/http-error";
import {
  findRequirement,
  hydrateRequirements,
  isDescendantOf,
} from "../mappers";
import { loadOr404 } from "./get-requirement";

/**
 * Reparents a requirement, or moves it to the top level when `targetId` is
 * null. Self-parenting and cycles are rejected explicitly: the self-referencing
 * `parent_id` column would happily store either, and a cycle would then make
 * every future `isDescendantOf` walk a no-op.
 */
async function moveRequirement(id: string, targetId: string | null) {
  const source = await loadOr404(id);

  if (targetId === id) {
    throw httpError(
      400,
      "requirement_cannot_parent_itself",
      "A requirement cannot be its own parent",
    );
  }

  if (targetId) {
    const target = await findRequirement(targetId);
    if (!target || target.workspaceId !== source.workspaceId) {
      throw httpError(
        404,
        "target_requirement_not_found",
        "Target requirement not found",
      );
    }

    if (await isDescendantOf(targetId, id)) {
      throw httpError(
        400,
        "requirement_move_would_create_cycle",
        "A requirement cannot be moved under one of its own descendants",
      );
    }
  }

  await db
    .update(schema.requirementTable)
    .set({ parentId: targetId })
    .where(eq(schema.requirementTable.id, id));

  const updated = await findRequirement(id);
  if (!updated) {
    throw httpError(404, "requirement_not_found", "Requirement not found");
  }

  const [hydrated] = await hydrateRequirements([updated]);
  if (!hydrated) {
    throw httpError(404, "requirement_not_found", "Requirement not found");
  }

  return hydrated;
}

export default moveRequirement;
