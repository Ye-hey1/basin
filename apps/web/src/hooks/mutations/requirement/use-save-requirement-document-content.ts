import { useMutation, useQueryClient } from "@tanstack/react-query";
import { saveRequirementDocumentContent } from "@/fetchers/requirement/documents";

export function useSaveRequirementDocumentContent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: saveRequirementDocumentContent,
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({
        queryKey: [
          "requirement-document",
          variables.documentId,
          variables.workspaceId,
        ],
      });
      queryClient.invalidateQueries({ queryKey: ["requirement-documents"] });
    },
  });
}
