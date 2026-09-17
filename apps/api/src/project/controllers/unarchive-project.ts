import { and, eq } from "drizzle-orm";
import db from "../../database";
import { projectTable } from "../../database/schema";
import { httpError } from "../../utils/http-error";

async function unarchiveProject(id: string, workspaceId: string) {
  const [existingProject] = await db
    .select()
    .from(projectTable)
    .where(
      and(eq(projectTable.id, id), eq(projectTable.workspaceId, workspaceId)),
    );

  if (!existingProject) {
    throw httpError(
      404,
      "project_doesn_t_exist_or_doesn_t_belong_to_the_specified_workspace",
      "Project doesn't exist or doesn't belong to the specified workspace",
    );
  }

  const [unarchivedProject] = await db
    .update(projectTable)
    .set({ archivedAt: null })
    .where(eq(projectTable.id, id))
    .returning();

  if (!unarchivedProject) {
    throw httpError(
      500,
      "failed_to_unarchive_project",
      "Failed to unarchive project",
    );
  }

  return unarchivedProject;
}

export default unarchiveProject;
