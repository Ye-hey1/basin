import { useQuery } from "@tanstack/react-query";
import { getAiThreadMessages } from "@/fetchers/ai/get-thread-messages";

function useGetAiThreadMessages(threadId: string) {
  return useQuery({
    queryKey: ["ai-thread-messages", threadId],
    queryFn: () => getAiThreadMessages(threadId),
    enabled: Boolean(threadId),
  });
}

export default useGetAiThreadMessages;
