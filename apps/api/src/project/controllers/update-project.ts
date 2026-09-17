import { and, eq } from "drizzle-orm";
import db from "../../database";
import { projectTable } from "../../database/schema";
import { httpError } from "../../utils/http-error";

async function updateProject(
  id: string,
  name: string,
  icon: string,
  slug: string,
  description: string,
  isPublic: boolean,
  workspaceId: string,
) {
  const [existingProject] = await db
    .select()
    .from(projectTable)
    .where(
      and(eq(projectTable.id, id), eq(projectTable.workspaceId, workspaceId)),
    );

  const isProjectExisting = Boolean(existingProject);

  if (!isProjectExisting) {
    throw httpError(
      404,
      "project_doesn_t_exist_or_doesn_t_belong_to_the_specified_workspace",
      "Project doesn't exist or doesn't belong to the specified workspace",
    );
  }

  const [updatedWorkspace] = await db
    .update(projectTable)
    .set({
      name,
      icon,
      slug,
      description,
      isPublic,
    })
    .where(eq(projectTable.id, id))
    .returning();

  return updatedWorkspace;
}

export default updateProject;
