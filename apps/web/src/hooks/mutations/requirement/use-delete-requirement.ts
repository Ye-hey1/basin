import { useMutation, useQueryClient } from "@tanstack/react-query";
import deleteRequirement from "@/fetchers/requirement/delete-requirement";

export function useDeleteRequirement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, workspaceId }: { id: string; workspaceId: string }) =>
      deleteRequirement(id, workspaceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["requirements"] });
      queryClient.invalidateQueries({ queryKey: ["requirement-options"] });
    },
  });
}
