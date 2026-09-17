import { useMutation, useQueryClient } from "@tanstack/react-query";
import moveRequirement from "@/fetchers/requirement/move-requirement";

export function useMoveRequirement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: {
      id: string;
      workspaceId: string;
      targetId: string | null;
    }) => moveRequirement(input),
    onSuccess: (requirement) => {
      queryClient.invalidateQueries({ queryKey: ["requirements"] });
      queryClient.invalidateQueries({ queryKey: ["requirement-options"] });
      queryClient.invalidateQueries({
        queryKey: ["requirement", requirement.id],
      });
    },
  });
}
