import { useQuery } from "@tanstack/react-query";
import { getAiStatus } from "@/fetchers/ai/get-ai-status";

function useGetAiStatus() {
  return useQuery({
    queryKey: ["ai-status"],
    queryFn: getAiStatus,
  });
}

export default useGetAiStatus;
