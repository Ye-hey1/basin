import { useMutation, useQueryClient } from "@tanstack/react-query";
import updateRequirementStatus from "@/fetchers/requirement/update-requirement-status";
import type { RequirementStatus } from "@/types/requirement";

export function useUpdateRequirementStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: {
      id: string;
      workspaceId: string;
      status: RequirementStatus;
    }) => updateRequirementStatus(input),
    onSuccess: (requirement) => {
      queryClient.invalidateQueries({ queryKey: ["requirements"] });
      queryClient.invalidateQueries({
        queryKey: ["requirement", requirement.id],
      });
    },
  });
}
