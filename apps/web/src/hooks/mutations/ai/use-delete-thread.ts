import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteAiThread } from "@/fetchers/ai/delete-thread";

function useDeleteAiThread() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (threadId: string) => deleteAiThread(threadId),
    onSuccess: (_data, threadId) => {
      queryClient.invalidateQueries({ queryKey: ["ai-threads"] });
      queryClient.removeQueries({ queryKey: ["ai-thread-messages", threadId] });
    },
  });
}

export default useDeleteAiThread;
