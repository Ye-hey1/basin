import { and, eq } from "drizzle-orm";
import db from "../../database";
import { projectTable } from "../../database/schema";
import { httpError } from "../../utils/http-error";

async function getProject(id: string, workspaceId: string) {
  const project = await db.query.projectTable.findFirst({
    where: and(
      eq(projectTable.id, id),
      eq(projectTable.workspaceId, workspaceId),
    ),
    with: {
      tasks: true,
    },
  });

  if (!project) {
    throw httpError(404, "project_not_found", "Project not found");
  }

  return project;
}

export default getProject;
