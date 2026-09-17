import { useQuery } from "@tanstack/react-query";
import getRequirementOptions from "@/fetchers/requirement/get-requirement-options";

/**
 * Selectable parents. `excludeId` drops a requirement and its subtree, which is
 * what keeps the move and parent pickers from offering an invalid target.
 */
function useRequirementOptions(
  workspaceId: string | undefined,
  excludeId?: string,
) {
  return useQuery({
    queryKey: ["requirement-options", workspaceId, excludeId],
    queryFn: () => getRequirementOptions(workspaceId as string, excludeId),
    enabled: Boolean(workspaceId),
    refetchOnWindowFocus: false,
  });
}

export default useRequirementOptions;
