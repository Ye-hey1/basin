import { useQuery } from "@tanstack/react-query";
import getRequirementTree from "@/fetchers/requirement/get-requirement-tree";
import type { RequirementListFilters } from "@/types/requirement";

/** The whole workspace forest, so the tree renders in one request. */
function useRequirementTree(filters: RequirementListFilters) {
  return useQuery({
    queryKey: ["requirements", "tree", filters],
    queryFn: () => getRequirementTree(filters),
    enabled: Boolean(filters.workspaceId),
    refetchOnWindowFocus: false,
  });
}

export default useRequirementTree;
