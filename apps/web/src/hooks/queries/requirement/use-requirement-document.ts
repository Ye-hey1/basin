import { useQuery } from "@tanstack/react-query";
import { getRequirementDocument } from "@/fetchers/requirement/documents";

/** One document, with the Markdown of its current version and its history. */
function useRequirementDocument(
  documentId: string | null | undefined,
  workspaceId: string | undefined,
) {
  return useQuery({
    queryKey: ["requirement-document", documentId, workspaceId],
    queryFn: () =>
      getRequirementDocument(documentId as string, workspaceId as string),
    enabled: Boolean(documentId && workspaceId),
    refetchOnWindowFocus: false,
  });
}

export default useRequirementDocument;
