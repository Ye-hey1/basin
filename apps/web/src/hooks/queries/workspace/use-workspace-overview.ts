import { useQuery } from "@tanstack/react-query";
import getWorkspaceOverview from "@/fetchers/workspace/get-workspace-overview";

function useWorkspaceOverview(workspaceId: string | undefined) {
  return useQuery({
    queryKey: ["workspace-overview", workspaceId],
    queryFn: () => getWorkspaceOverview(workspaceId as string),
    enabled: Boolean(workspaceId),
    refetchOnWindowFocus: false,
  });
}

export default useWorkspaceOverview;
