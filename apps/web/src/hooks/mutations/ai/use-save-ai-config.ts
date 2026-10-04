import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  type SaveAiConfigRequest,
  saveAiConfig,
} from "@/fetchers/ai/save-ai-config";

function useSaveAiConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (config: SaveAiConfigRequest) => saveAiConfig(config),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai-config"] });
      queryClient.invalidateQueries({ queryKey: ["ai-status"] });
    },
  });
}

export default useSaveAiConfig;
