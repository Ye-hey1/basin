import { and, eq } from "drizzle-orm";
import db from "../../database";
import { integrationTable } from "../../database/schema";
import { httpError } from "../../utils/http-error";

async function deleteGithubIntegration(projectId: string) {
  const existingIntegration = await db.query.integrationTable.findFirst({
    where: and(
      eq(integrationTable.projectId, projectId),
      eq(integrationTable.type, "github"),
    ),
  });

  if (!existingIntegration) {
    throw httpError(
      404,
      "github_integration_not_found",
      "GitHub integration not found",
    );
  }

  await db
    .delete(integrationTable)
    .where(
      and(
        eq(integrationTable.projectId, projectId),
        eq(integrationTable.type, "github"),
      ),
    );

  return { success: true, message: "GitHub integration deleted" };
}

export default deleteGithubIntegration;
