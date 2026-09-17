import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateRequirementDocument } from "@/fetchers/requirement/documents";

export function useUpdateRequirementDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateRequirementDocument,
    onSuccess: (_document, variables) => {
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
