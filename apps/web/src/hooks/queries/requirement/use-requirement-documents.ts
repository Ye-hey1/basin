import { useQuery } from "@tanstack/react-query";
import { listRequirementDocuments } from "@/fetchers/requirement/documents";

/** Documents attached to a requirement, without their Markdown. */
function useRequirementDocuments(
  requirementId: string | null | undefined,
  workspaceId: string | undefined,
) {
  return useQuery({
    queryKey: ["requirement-documents", requirementId, workspaceId],
    queryFn: () =>
      listRequirementDocuments(requirementId as string, workspaceId as string),
    enabled: Boolean(requirementId && workspaceId),
    refetchOnWindowFocus: false,
  });
}

export default useRequirementDocuments;
