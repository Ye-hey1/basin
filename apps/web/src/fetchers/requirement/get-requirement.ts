import { client } from "@kaneo/libs";
import { HttpError } from "@/lib/http-error";
import type { RequirementDetail } from "@/types/requirement";

async function getRequirement(id: string, workspaceId: string) {
  const response = await client.requirement[":id"].$get({
    param: { id },
    query: { workspaceId },
  });

  if (!response.ok) {
    throw await HttpError.fromResponse(response, "Failed to fetch requirement");
  }

  return (await response.json()) as RequirementDetail;
}

export default getRequirement;
