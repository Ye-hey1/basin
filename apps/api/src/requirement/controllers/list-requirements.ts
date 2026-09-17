import db, { schema } from "../../database";
import type { z } from "../../openapi";
import { hydrateRequirements, requirementColumns } from "../mappers";
import { buildRequirementFilter, requirementOrder } from "../queries";
import type { requirementListQuery } from "../schema";

type RequirementListFilters = z.infer<typeof requirementListQuery>;

/**
 * Flat list of requirements. Context reads share this so the tree and the
 * picker cannot disagree about what a filter matches.
 */
async function listRequirements(filters: RequirementListFilters) {
  const rows = await db
    .select(requirementColumns)
    .from(schema.requirementTable)
    .where(buildRequirementFilter(filters))
    .orderBy(...requirementOrder);

  return hydrateRequirements(rows);
}

export default listRequirements;
