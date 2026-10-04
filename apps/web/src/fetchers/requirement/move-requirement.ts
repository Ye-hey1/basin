import { client } from "@basin/libs";
import { HttpError } from "@/lib/http-error";
import type { Requirement } from "@/types/requirement";

async function moveRequirement({
  id,
  workspaceId,
  targetId,
}: {
  id: string;
  workspaceId: string;
  targetId: string | null;
}) {
  const response = await client.requirement[":id"].move.$post({
    param: { id },
    query: { workspaceId },
    json: { targetId },
  });

  if (!response.ok) {
    throw await HttpError.fromResponse(response, "Failed to move requirement");
  }

  return (await response.json()) as Requirement;
}

export default moveRequirement;
