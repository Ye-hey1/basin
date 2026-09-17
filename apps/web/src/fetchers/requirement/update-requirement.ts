import { client } from "@kaneo/libs";
import { HttpError } from "@/lib/http-error";
import type { Requirement, UpdateRequirementInput } from "@/types/requirement";

async function updateRequirement({
  id,
  workspaceId,
  ...input
}: UpdateRequirementInput & { id: string; workspaceId: string }) {
  const response = await client.requirement[":id"].$patch({
    param: { id },
    query: { workspaceId },
    json: input,
  });

  if (!response.ok) {
    throw await HttpError.fromResponse(
      response,
      "Failed to update requirement",
    );
  }

  return (await response.json()) as Requirement;
}

export default updateRequirement;
