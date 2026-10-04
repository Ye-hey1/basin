import { useQuery } from "@tanstack/react-query";
import { getAiConfig } from "@/fetchers/ai/get-ai-config";

function useGetAiConfig() {
  return useQuery({
    queryKey: ["ai-config"],
    queryFn: getAiConfig,
  });
}

export default useGetAiConfig;
