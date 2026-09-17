import { and, eq, or } from "drizzle-orm";
import db, { schema } from "../database";
import { httpError } from "./http-error";

export async function validateWorkspaceAccess(
  userId: string,
  workspaceId: string,
  apiKeyId?: string,
): Promise<void> {
  if (apiKeyId) {
    const apiKey = await db
      .select()
      .from(schema.apikeyTable)
      .where(
        and(
          eq(schema.apikeyTable.id, apiKeyId),
          or(
            eq(schema.apikeyTable.referenceId, userId),
            eq(schema.apikeyTable.userId, userId),
          ),
          eq(schema.apikeyTable.enabled, true),
        ),
      )
      .limit(1);

    if (apiKey.length === 0) {
      throw httpError(
        403,
        "invalid_api_key_for_this_workspace",
        "Invalid API key for this workspace",
      );
    }
  }

  const [user] = await db
    .select({ role: schema.userTable.role })
    .from(schema.userTable)
    .where(eq(schema.userTable.id, userId))
    .limit(1);

  if (user?.role === "admin") {
    return;
  }

  const membership = await db
    .select()
    .from(schema.workspaceUserTable)
    .where(
      and(
        eq(schema.workspaceUserTable.userId, userId),
        eq(schema.workspaceUserTable.workspaceId, workspaceId),
      ),
    )
    .limit(1);

  if (membership.length === 0) {
    throw httpError(
      403,
      "you_don_t_have_access_to_this_workspace",
      "You don't have access to this workspace",
    );
  }
}
