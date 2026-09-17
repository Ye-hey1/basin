import { useMutation, useQueryClient } from "@tanstack/react-query";
import duplicateTask from "@/fetchers/task/duplicate-task";
import type Task from "@/types/task";

export function useDuplicateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (task: Task) => duplicateTask(task.id),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["tasks", variables.projectId],
      });
      queryClient.invalidateQueries({
        queryKey: ["projects"],
      });
      queryClient.invalidateQueries({
        queryKey: ["workspace-overview"],
      });
    },
  });
}
