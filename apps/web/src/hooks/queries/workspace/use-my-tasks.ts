import { useQuery } from "@tanstack/react-query";
import getMyTasks from "@/fetchers/workspace/get-my-tasks";

function useMyTasks(workspaceId: string | undefined) {
  return useQuery({
    queryKey: ["my-tasks", workspaceId],
    queryFn: () => getMyTasks(workspaceId as string),
    enabled: Boolean(workspaceId),
    refetchOnWindowFocus: false,
  });
}

export default useMyTasks;
