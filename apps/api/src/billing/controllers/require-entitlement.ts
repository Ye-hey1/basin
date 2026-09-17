import { eq } from "drizzle-orm";
import db from "../../database";
import { projectTable } from "../../database/schema";
import { httpError } from "../../utils/http-error";
import { isBillingEnabled } from "../config";
import {
  computeEntitlement,
  getOrCreateWorkspaceBilling,
} from "./get-workspace-billing";

export async function requireWorkspaceEntitlement(workspaceId: string) {
  if (!isBillingEnabled()) {
    return;
  }

  const billing = await getOrCreateWorkspaceBilling(workspaceId);
  const entitlement = computeEntitlement(billing);

  if (!entitlement.active) {
    throw httpError(
      402,
      "this_workspace_s_kaneo_cloud_plan_has_expired_subscribe_to_continue_creating_and",
      "This workspace's Kaneo Cloud plan has expired. Subscribe to continue creating and editing.",
    );
  }
}

export async function requireProjectEntitlement(projectId: string) {
  if (!isBillingEnabled()) {
    return;
  }

  const [project] = await db
    .select({ workspaceId: projectTable.workspaceId })
    .from(projectTable)
    .where(eq(projectTable.id, projectId));

  if (!project) {
    return;
  }

  await requireWorkspaceEntitlement(project.workspaceId);
}
