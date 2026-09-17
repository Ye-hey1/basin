import { useQuery } from "@tanstack/react-query";
import getRequirementTasks from "@/fetchers/requirement/get-requirement-tasks";

function useRequirementTasks(
  requirementId: string | null | undefined,
  workspaceId: string | undefined,
) {
  return useQuery({
    queryKey: ["requirement-tasks", requirementId, workspaceId],
    queryFn: () =>
      getRequirementTasks(requirementId as string, workspaceId as string),
    enabled: Boolean(requirementId && workspaceId),
    refetchOnWindowFocus: false,
  });
}

export default useRequirementTasks;
