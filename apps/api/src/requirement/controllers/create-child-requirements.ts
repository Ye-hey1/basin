import type { z } from "../../openapi";
import { asPriority, asType } from "../mappers";
import type { createChildRequirementsBody } from "../schema";
import createRequirement from "./create-requirement";
import { loadOr404 } from "./get-requirement";

type CreateChildRequirementsInput = z.infer<typeof createChildRequirementsBody>;

/**
 * Creates several sibling requirements under one parent. Each child is created
 * through the same path as a single create so ordering, project inheritance and
 * validation cannot diverge between the two.
 */
async function createChildRequirements(
  parentId: string,
  input: CreateChildRequirementsInput,
  userId: string,
) {
  const parent = await loadOr404(parentId);

  const created = [];
  for (const title of input.titles) {
    created.push(
      await createRequirement(
        {
          workspaceId: parent.workspaceId,
          parentId,
          title,
          priority: asPriority(parent.priority),
          type: asType(parent.type),
        },
        userId,
      ),
    );
  }

  return created;
}

export default createChildRequirements;
