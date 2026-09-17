import { eq } from "drizzle-orm";
import db, { schema } from "../database";
import { httpError } from "../utils/http-error";

/**
 * A task may only point at a requirement from the same workspace.
 *
 * There is no database constraint that can express this: `task` carries
 * `project_id` and `requirement_id`, and the workspace lives on the project and
 * the requirement respectively, so the two could otherwise be crossed. A
 * mismatch is reported as not-found rather than forbidden so the response
 * cannot be used to probe for requirements in other workspaces.
 */
export async function assertRequirementInWorkspace(
  requirementId: string,
  workspaceId: string,
): Promise<void> {
  const [requirement] = await db
    .select({ workspaceId: schema.requirementTable.workspaceId })
    .from(schema.requirementTable)
    .where(eq(schema.requirementTable.id, requirementId))
    .limit(1);

  if (!requirement || requirement.workspaceId !== workspaceId) {
    throw httpError(404, "requirement_not_found", "Requirement not found");
  }
}
