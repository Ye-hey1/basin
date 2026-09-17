import { useMutation, useQueryClient } from "@tanstack/react-query";
import createRequirement from "@/fetchers/requirement/create-requirement";
import type { CreateRequirementInput } from "@/types/requirement";

export function useCreateRequirement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateRequirementInput) => createRequirement(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["requirements"] });
      queryClient.invalidateQueries({ queryKey: ["requirement-options"] });
    },
  });
}
