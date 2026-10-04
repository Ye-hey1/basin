import { client } from "@basin/libs";
import { HttpError } from "@/lib/http-error";
import type { Requirement, RequirementStatus } from "@/types/requirement";

async function updateRequirementStatus({
  id,
  workspaceId,
  status,
}: {
  id: string;
  workspaceId: string;
  status: RequirementStatus;
}) {
  const response = await client.requirement[":id"].status.$post({
    param: { id },
    query: { workspaceId },
    json: { status },
  });

  if (!response.ok) {
    throw await HttpError.fromResponse(
      response,
      "Failed to update requirement status",
    );
  }

  return (await response.json()) as Requirement;
}

export default updateRequirementStatus;
