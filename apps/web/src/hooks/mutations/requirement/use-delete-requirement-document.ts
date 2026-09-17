import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteRequirementDocument } from "@/fetchers/requirement/documents";

export function useDeleteRequirementDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      documentId,
      workspaceId,
    }: {
      documentId: string;
      workspaceId: string;
    }) => deleteRequirementDocument(documentId, workspaceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["requirement-documents"] });
      queryClient.invalidateQueries({ queryKey: ["requirement"] });
      queryClient.invalidateQueries({ queryKey: ["requirements"] });
    },
  });
}
