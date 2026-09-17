import { useQuery } from "@tanstack/react-query";
import getRequirement from "@/fetchers/requirement/get-requirement";

/** One requirement, including the parent title the tree cannot supply. */
function useRequirement(
  requirementId: string | null,
  workspaceId: string | undefined,
) {
  return useQuery({
    queryKey: ["requirement", requirementId, workspaceId],
    queryFn: () =>
      getRequirement(requirementId as string, workspaceId as string),
    enabled: Boolean(requirementId && workspaceId),
    refetchOnWindowFocus: false,
  });
}

export default useRequirement;
