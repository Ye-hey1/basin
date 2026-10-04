import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createMcpServer,
  deleteMcpServer,
  updateMcpServer,
} from "@/fetchers/agents/mcp-servers";
import {
  createAgentTrigger,
  deleteAgentTrigger,
  runAgentTrigger,
  updateAgentTrigger,
} from "@/fetchers/agents/triggers";

function useInvalidateAgents() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ["agent-triggers"] });
    queryClient.invalidateQueries({ queryKey: ["agent-runs"] });
    queryClient.invalidateQueries({ queryKey: ["mcp-servers"] });
  };
}

export function useCreateAgentTrigger() {
  const invalidate = useInvalidateAgents();
  return useMutation({ mutationFn: createAgentTrigger, onSuccess: invalidate });
}

export function useUpdateAgentTrigger() {
  const invalidate = useInvalidateAgents();
  return useMutation({ mutationFn: updateAgentTrigger, onSuccess: invalidate });
}

export function useDeleteAgentTrigger() {
  const invalidate = useInvalidateAgents();
  return useMutation({
    mutationFn: ({ id, workspaceId }: { id: string; workspaceId: string }) =>
      deleteAgentTrigger(id, workspaceId),
    onSuccess: invalidate,
  });
}

export function useRunAgentTrigger() {
  const invalidate = useInvalidateAgents();
  return useMutation({
    mutationFn: ({ id, workspaceId }: { id: string; workspaceId: string }) =>
      runAgentTrigger(id, workspaceId),
    onSuccess: invalidate,
  });
}

export function useCreateMcpServer() {
  const invalidate = useInvalidateAgents();
  return useMutation({ mutationFn: createMcpServer, onSuccess: invalidate });
}

export function useUpdateMcpServer() {
  const invalidate = useInvalidateAgents();
  return useMutation({ mutationFn: updateMcpServer, onSuccess: invalidate });
}

export function useDeleteMcpServer() {
  const invalidate = useInvalidateAgents();
  return useMutation({
    mutationFn: ({ id, workspaceId }: { id: string; workspaceId: string }) =>
      deleteMcpServer(id, workspaceId),
    onSuccess: invalidate,
  });
}
