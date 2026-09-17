import { and, eq } from "drizzle-orm";
import db from "../../database";
import { columnTable, workflowRuleTable } from "../../database/schema";
import { httpError } from "../../utils/http-error";

async function upsertWorkflowRule({
  projectId,
  integrationType,
  eventType,
  columnId,
}: {
  projectId: string;
  integrationType: string;
  eventType: string;
  columnId: string;
}) {
  const targetColumn = await db.query.columnTable.findFirst({
    where: and(
      eq(columnTable.id, columnId),
      eq(columnTable.projectId, projectId),
    ),
  });

  if (!targetColumn) {
    throw httpError(
      400,
      "column_does_not_belong_to_the_provided_project",
      "Column does not belong to the provided project",
    );
  }

  const existing = await db.query.workflowRuleTable.findFirst({
    where: and(
      eq(workflowRuleTable.projectId, projectId),
      eq(workflowRuleTable.integrationType, integrationType),
      eq(workflowRuleTable.eventType, eventType),
    ),
  });

  if (existing) {
    const [updated] = await db
      .update(workflowRuleTable)
      .set({ columnId })
      .where(eq(workflowRuleTable.id, existing.id))
      .returning();

    if (!updated) {
      throw httpError(
        500,
        "failed_to_update_workflow_rule",
        "Failed to update workflow rule",
      );
    }

    return updated;
  }

  const [created] = await db
    .insert(workflowRuleTable)
    .values({
      projectId,
      integrationType,
      eventType,
      columnId,
    })
    .returning();

  if (!created) {
    throw httpError(
      500,
      "failed_to_create_workflow_rule",
      "Failed to create workflow rule",
    );
  }

  return created;
}

export default upsertWorkflowRule;
