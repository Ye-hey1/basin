import { useMutation, useQueryClient } from "@tanstack/react-query";
import updateTaskRequirement from "@/fetchers/task/update-task-requirement";

export function useUpdateTaskRequirement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: {
      taskId: string;
      projectId: string;
      requirementId: string | null;
    }) => updateTaskRequirement(input.taskId, input.requirementId),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["task", variables.taskId] });
      queryClient.invalidateQueries({
        queryKey: ["tasks", variables.projectId],
      });
      // The requirement's task list and progress counters both change.
      queryClient.invalidateQueries({ queryKey: ["requirement-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["requirements"] });
      queryClient.invalidateQueries({ queryKey: ["requirement"] });
    },
  });
}
