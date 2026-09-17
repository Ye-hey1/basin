import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createRequirementDocument } from "@/fetchers/requirement/documents";

export function useCreateRequirementDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createRequirementDocument,
    onSuccess: (_document, variables) => {
      queryClient.invalidateQueries({
        queryKey: [
          "requirement-documents",
          variables.id,
          variables.workspaceId,
        ],
      });
      // The requirement's document count changes too.
      queryClient.invalidateQueries({ queryKey: ["requirement"] });
      queryClient.invalidateQueries({ queryKey: ["requirements"] });
    },
  });
}
