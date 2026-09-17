import { eq } from "drizzle-orm";
import db from "../../database";
import { workflowRuleTable } from "../../database/schema";
import { httpError } from "../../utils/http-error";

async function deleteWorkflowRule(id: string) {
  const existing = await db.query.workflowRuleTable.findFirst({
    where: eq(workflowRuleTable.id, id),
  });

  if (!existing) {
    throw httpError(404, "workflow_rule_not_found", "Workflow rule not found");
  }

  await db.delete(workflowRuleTable).where(eq(workflowRuleTable.id, id));

  return existing;
}

export default deleteWorkflowRule;
