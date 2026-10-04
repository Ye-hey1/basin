import { useQuery } from "@tanstack/react-query";
import { getAiThreads } from "@/fetchers/ai/get-threads";

function useGetAiThreads(workspaceId: string) {
  return useQuery({
    queryKey: ["ai-threads", workspaceId],
    queryFn: () => getAiThreads(workspaceId),
    enabled: Boolean(workspaceId),
  });
}

export default useGetAiThreads;
