import { client } from "@kaneo/libs";
import { HttpError } from "@/lib/http-error";
import type { RequirementOption } from "@/types/requirement";

async function getRequirementOptions(workspaceId: string, excludeId?: string) {
  const response = await client.requirement.options.$get({
    query: { workspaceId, excludeId },
  });

  if (!response.ok) {
    throw await HttpError.fromResponse(
      response,
      "Failed to fetch requirement options",
    );
  }

  return (await response.json()) as RequirementOption[];
}

export default getRequirementOptions;
