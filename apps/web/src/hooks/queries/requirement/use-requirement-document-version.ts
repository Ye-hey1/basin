import { useQuery } from "@tanstack/react-query";
import { getRequirementDocumentVersion } from "@/fetchers/requirement/documents";

/**
 * One past version of a document. Kept separate from the document query so
 * reading history never refetches the current text.
 */
function useRequirementDocumentVersion(
  documentId: string | null | undefined,
  workspaceId: string | undefined,
  version: number | null,
) {
  return useQuery({
    queryKey: [
      "requirement-document-version",
      documentId,
      workspaceId,
      version,
    ],
    queryFn: () =>
      getRequirementDocumentVersion({
        documentId: documentId as string,
        workspaceId: workspaceId as string,
        version: version as number,
      }),
    enabled: Boolean(documentId && workspaceId && version),
    refetchOnWindowFocus: false,
  });
}

export default useRequirementDocumentVersion;
