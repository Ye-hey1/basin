import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createAiThread } from "@/fetchers/ai/create-thread";

function useCreateAiThread() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createAiThread,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai-threads"] });
    },
  });
}

export default useCreateAiThread;
