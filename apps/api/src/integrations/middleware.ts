import { eq } from "drizzle-orm";
import type { Context, Next } from "hono";
import db from "../database";
import { projectTable } from "../database/schema";
import { httpError } from "../utils/http-error";
import { validateWorkspaceAccess } from "../utils/validate-workspace-access";

// Route middleware runs before the validators, so c.req.valid() is unavailable.
export async function scopeToProjectFromBody(c: Context, next: Next) {
  const userId = c.get("userId");
  if (!userId) {
    throw httpError(401, "unauthorized", "Unauthorized");
  }

  const body = (await c.req.json().catch(() => ({}))) as {
    projectId?: unknown;
  };
  const projectId = typeof body?.projectId === "string" ? body.projectId : null;
  if (!projectId) {
    throw httpError(400, "projectid_is_required", "projectId is required");
  }

  const [project] = await db
    .select({ workspaceId: projectTable.workspaceId })
    .from(projectTable)
    .where(eq(projectTable.id, projectId))
    .limit(1);

  if (!project) {
    throw httpError(404, "project_not_found", "Project not found");
  }

  await validateWorkspaceAccess(
    userId,
    project.workspaceId,
    c.get("apiKey")?.id,
  );
  c.set("workspaceId", project.workspaceId);

  return next();
}
