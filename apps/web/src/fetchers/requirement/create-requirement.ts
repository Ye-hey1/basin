import { client } from "@basin/libs";
import { HttpError } from "@/lib/http-error";
import type { CreateRequirementInput, Requirement } from "@/types/requirement";

async function createRequirement(input: CreateRequirementInput) {
  const response = await client.requirement.$post({ json: input });

  if (!response.ok) {
    throw await HttpError.fromResponse(
      response,
      "Failed to create requirement",
    );
  }

  return (await response.json()) as Requirement;
}

export default createRequirement;
