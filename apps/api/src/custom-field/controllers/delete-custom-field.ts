import { eq } from "drizzle-orm";
import db from "../../database";
import {
  customFieldDefinitionTable,
  projectTable,
} from "../../database/schema";
import { httpError } from "../../utils/http-error";

async function deleteCustomField(id: string) {
  const [field] = await db
    .select({
      projectId: customFieldDefinitionTable.projectId,
      workspaceId: projectTable.workspaceId,
    })
    .from(customFieldDefinitionTable)
    .innerJoin(
      projectTable,
      eq(projectTable.id, customFieldDefinitionTable.projectId),
    )
    .where(eq(customFieldDefinitionTable.id, id))
    .limit(1);

  if (!field) {
    throw httpError(
      404,
      "custom_field_or_project_not_found",
      "Custom field or project not found",
    );
  }

  if (!field.workspaceId) {
    throw httpError(
      400,
      "project_workspace_not_found",
      "The project is not associated with a workspace",
    );
  }

  const [deleted] = await db
    .delete(customFieldDefinitionTable)
    .where(eq(customFieldDefinitionTable.id, id))
    .returning();

  if (!deleted) {
    throw httpError(404, "custom_field_not_found", "Custom field not found");
  }

  return {
    ...deleted,
    workspaceId: field.workspaceId,
  };
}

export default deleteCustomField;
