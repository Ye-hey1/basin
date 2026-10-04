import { createId } from "@paralleldrive/cuid2";
import { count, eq } from "drizzle-orm";
import db from "../../database";
import { workspaceUserTable } from "../../database/schema";
import { httpError } from "../../utils/http-error";
import {
  type BillingInterval,
  isBillingEnabled,
  type Plan,
  productIdFor,
} from "../config";
import { createCheckoutSession } from "../creem-client";
import { getOrCreateWorkspaceBilling } from "./get-workspace-billing";

async function createCheckout({
  workspaceId,
  plan,
  interval,
  userEmail,
}: {
  workspaceId: string;
  plan: Plan;
  interval: BillingInterval;
  userEmail: string;
}) {
  if (!isBillingEnabled()) {
    throw httpError(400, "billing_is_not_enabled", "Billing is not enabled");
  }

  const productId = productIdFor(plan, interval);
  if (!productId) {
    throw httpError(400, "unknown_plan", "Unknown plan");
  }

  const billing = await getOrCreateWorkspaceBilling(workspaceId);
  if (billing.status === "active") {
    throw httpError(
      400,
      "workspace_already_has_an_active_subscription",
      "Workspace already has an active subscription",
    );
  }

  let units = 1;
  if (plan === "team") {
    const [members] = await db
      .select({ value: count() })
      .from(workspaceUserTable)
      .where(eq(workspaceUserTable.workspaceId, workspaceId));
    units = Math.max(1, members?.value ?? 1);
  }

  const clientUrl = process.env.BASIN_CLIENT_URL ?? "";
  const { checkoutUrl } = await createCheckoutSession({
    productId,
    units,
    successUrl: `${clientUrl}/dashboard/settings/workspace/billing?checkout=success`,
    requestId: createId(),
    customerEmail: userEmail,
    metadata: { workspaceId, plan, interval },
  });

  return { checkoutUrl };
}

export default createCheckout;
