import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createAcceptanceItem,
  deleteAcceptanceItem,
  updateAcceptanceItem,
} from "@/fetchers/requirement/acceptance-items";
import createChildRequirements from "@/fetchers/requirement/create-child-requirements";

function useInvalidateRequirements() {
  const queryClient = useQueryClient();

  return (requirementId?: string) => {
    queryClient.invalidateQueries({ queryKey: ["requirements"] });
    queryClient.invalidateQueries({ queryKey: ["requirement-options"] });
    if (requirementId) {
      queryClient.invalidateQueries({
        queryKey: ["requirement", requirementId],
      });
    }
  };
}

export function useCreateChildRequirements() {
  const invalidate = useInvalidateRequirements();

  return useMutation({
    mutationFn: (input: {
      id: string;
      workspaceId: string;
      titles: string[];
    }) => createChildRequirements(input),
    onSuccess: (_data, variables) => invalidate(variables.id),
  });
}

export function useCreateAcceptanceItem() {
  const invalidate = useInvalidateRequirements();

  return useMutation({
    mutationFn: (input: {
      id: string;
      workspaceId: string;
      title: string;
      criterion?: string | null;
    }) => createAcceptanceItem(input),
    onSuccess: (_data, variables) => invalidate(variables.id),
  });
}

export function useUpdateAcceptanceItem() {
  const invalidate = useInvalidateRequirements();

  return useMutation({
    mutationFn: (input: {
      itemId: string;
      workspaceId: string;
      requirementId: string;
      title?: string;
      criterion?: string | null;
      status?: "pending" | "passed" | "failed";
      note?: string | null;
      position?: number;
    }) => {
      const { requirementId: _requirementId, ...rest } = input;
      return updateAcceptanceItem(rest);
    },
    onSuccess: (_data, variables) => invalidate(variables.requirementId),
  });
}

export function useDeleteAcceptanceItem() {
  const invalidate = useInvalidateRequirements();

  return useMutation({
    mutationFn: (input: {
      itemId: string;
      workspaceId: string;
      requirementId: string;
    }) => deleteAcceptanceItem(input.itemId, input.workspaceId),
    onSuccess: (_data, variables) => invalidate(variables.requirementId),
  });
}
