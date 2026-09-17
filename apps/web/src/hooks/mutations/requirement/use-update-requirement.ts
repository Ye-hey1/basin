import { useMutation, useQueryClient } from "@tanstack/react-query";
import updateRequirement from "@/fetchers/requirement/update-requirement";
import type { UpdateRequirementInput } from "@/types/requirement";

export function useUpdateRequirement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (
      input: UpdateRequirementInput & { id: string; workspaceId: string },
    ) => updateRequirement(input),
    onSuccess: (requirement) => {
      queryClient.invalidateQueries({ queryKey: ["requirements"] });
      queryClient.invalidateQueries({ queryKey: ["requirement-options"] });
      queryClient.invalidateQueries({
        queryKey: ["requirement", requirement.id],
      });
    },
  });
}
