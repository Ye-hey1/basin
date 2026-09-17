import { eq } from "drizzle-orm";
import db from "../../database";
import { projectTable } from "../../database/schema";
import { httpError } from "../../utils/http-error";
import getProject from "./get-project";

async function deleteProject(id: string, workspaceId: string) {
  const existingProject = await getProject(id, workspaceId);

  const [deletedProject] = await db
    .delete(projectTable)
    .where(eq(projectTable.id, id))
    .returning();

  if (!deletedProject) {
    throw httpError(
      500,
      "failed_to_delete_project",
      "Failed to delete project",
    );
  }

  return existingProject;
}

export default deleteProject;
