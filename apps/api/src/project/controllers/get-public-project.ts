import { eq } from "drizzle-orm";
import db from "../../database";
import { projectTable } from "../../database/schema";
import getTasks from "../../task/controllers/get-tasks";
import { httpError } from "../../utils/http-error";

export async function getPublicProject(id: string) {
  const [project] = await db
    .select({ isPublic: projectTable.isPublic })
    .from(projectTable)
    .where(eq(projectTable.id, id))
    .limit(1);

  if (!project) {
    throw httpError(404, "project_not_found", "Project not found");
  }

  if (!project.isPublic) {
    throw httpError(403, "project_is_not_public", "Project is not public");
  }

  const result = await getTasks(id);

  if (!result.data) {
    throw httpError(404, "project_not_found", "Project not found");
  }

  if (!result.data.isPublic) {
    throw httpError(403, "project_is_not_public", "Project is not public");
  }

  return result.data;
}
