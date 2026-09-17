import { and, eq } from "drizzle-orm";
import db from "../../database";
import { projectTable } from "../../database/schema";
import { httpError } from "../../utils/http-error";

async function archiveProject(id: string, workspaceId: string) {
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

  const [archivedProject] = await db
    .update(projectTable)
    .set({ archivedAt: new Date() })
    .where(eq(projectTable.id, id))
    .returning();

  if (!archivedProject) {
    throw httpError(
      500,
      "failed_to_archive_project",
      "Failed to archive project",
    );
  }

  return archivedProject;
}

export default archiveProject;
