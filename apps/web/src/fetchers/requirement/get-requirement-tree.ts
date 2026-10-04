import { client } from "@basin/libs";
import { HttpError } from "@/lib/http-error";
import type {
  RequirementListFilters,
  RequirementTreeNode,
} from "@/types/requirement";

async function getRequirementTree(filters: RequirementListFilters) {
  const response = await client.requirement.tree.$get({ query: filters });

  if (!response.ok) {
    throw await HttpError.fromResponse(
      response,
      "Failed to fetch requirements",
    );
  }

  return (await response.json()) as RequirementTreeNode[];
}

export default getRequirementTree;
