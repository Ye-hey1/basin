import { client } from "@kaneo/libs";
import { HttpError } from "@/lib/http-error";
import type { Requirement } from "@/types/requirement";

/** Creates sibling sub-requirements under one parent. */
async function createChildRequirements({
  id,
  workspaceId,
  titles,
}: {
  id: string;
  workspaceId: string;
  titles: string[];
}): Promise<Requirement[]> {
  const response = await client.requirement[":id"].children.$post({
    param: { id },
    query: { workspaceId },
    json: { titles },
  });

  if (!response.ok) {
    throw await HttpError.fromResponse(
      response,
      "Failed to create sub-requirements",
    );
  }

  return (await response.json()) as Requirement[];
}

export default createChildRequirements;
