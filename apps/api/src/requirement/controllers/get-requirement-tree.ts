import type { z } from "../../openapi";
import { buildRequirementTree } from "../mappers";
import type { requirementListQuery } from "../schema";
import listRequirements from "./list-requirements";

type RequirementListFilters = z.infer<typeof requirementListQuery>;

/**
 * Whole-forest read for a workspace. The PRD breakdown is inherently a tree,
 * so the client gets it nested in one response instead of stitching parents
 * together from pages.
 */
async function getRequirementTree(filters: RequirementListFilters) {
  const nodes = await listRequirements(filters);
  return buildRequirementTree(nodes);
}

export default getRequirementTree;
