import { useQuery } from "@tanstack/react-query";
import { getMcpServers } from "@/fetchers/agents/mcp-servers";
import { getAgentRuns } from "@/fetchers/agents/runs";
import { getAgentTriggers } from "@/fetchers/agents/triggers";

export function useGetAgentTriggers(workspaceId: string) {
  return useQuery({
    queryKey: ["agent-triggers", workspaceId],
    queryFn: () => getAgentTriggers(workspaceId),
    enabled: Boolean(workspaceId),
  });
}

export function useGetAgentRuns(workspaceId: string) {
  return useQuery({
    queryKey: ["agent-runs", workspaceId],
    queryFn: () => getAgentRuns(workspaceId, 50),
    enabled: Boolean(workspaceId),
  });
}

export function useGetMcpServers(workspaceId: string) {
  return useQuery({
    queryKey: ["mcp-servers", workspaceId],
    queryFn: () => getMcpServers(workspaceId),
    enabled: Boolean(workspaceId),
  });
}
