import { client } from "@basin/libs";
import { HttpError } from "@/lib/http-error";
import type { RequirementTask } from "@/types/requirement";

/**
 * Tasks linked to a requirement, across every project in the workspace.
 *
 * Deliberately not the project-scoped task list: a requirement spans projects.
 */
async function getRequirementTasks(requirementId: string, workspaceId: string) {
  const response = await client.requirement[":id"].tasks.$get({
    param: { id: requirementId },
    query: { workspaceId },
  });

  if (!response.ok) {
    throw await HttpError.fromResponse(
      response,
      "Failed to fetch requirement tasks",
    );
  }

  return (await response.json()) as RequirementTask[];
}

export default getRequirementTasks;
