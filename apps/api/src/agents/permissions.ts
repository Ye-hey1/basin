import { type BuiltInRoleName, builtInRoles } from "@basin/permissions";
import { and, eq } from "drizzle-orm";
import db, { schema } from "../database";

type PermissionMap = Record<string, string[]>;

// Mirrors the resolution order in utils/require-workspace-permission.ts
// (DB role row first, built-in roles as fallback) without the hono context,
// because agent runs execute outside HTTP requests.
function builtInRoleStatements(role: string) {
  if (role in builtInRoles) {
    return builtInRoles[role as BuiltInRoleName].statements as Record<
      string,
      readonly string[]
    >;
  }
  return null;
}

function parsePermissionStatements(raw: string) {
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const result: Record<string, string[]> = {};
  for (const [resource, actions] of Object.entries(
    value as Record<string, unknown>,
  )) {
    if (!Array.isArray(actions)) continue;
    const filtered = actions.filter(
      (action): action is string => typeof action === "string",
    );
    if (filtered.length > 0) {
      result[resource] = filtered;
    }
  }
  return result;
}

function satisfies(
  statements: Record<string, readonly string[]>,
  required: PermissionMap,
): boolean {
  for (const [resource, actions] of Object.entries(required)) {
    const granted = statements[resource];
    if (!granted) return false;
    for (const action of actions) {
      if (!granted.includes(action)) return false;
    }
  }
  return true;
}

export async function userHasWorkspacePermission(
  userId: string,
  workspaceId: string,
  permissions: PermissionMap,
): Promise<boolean> {
  const [member] = await db
    .select({ role: schema.workspaceUserTable.role })
    .from(schema.workspaceUserTable)
    .where(
      and(
        eq(schema.workspaceUserTable.workspaceId, workspaceId),
        eq(schema.workspaceUserTable.userId, userId),
      ),
    )
    .limit(1);

  if (!member?.role) return false;

  const [row] = await db
    .select({ permission: schema.workspaceRoleTable.permission })
    .from(schema.workspaceRoleTable)
    .where(
      and(
        eq(schema.workspaceRoleTable.workspaceId, workspaceId),
        eq(schema.workspaceRoleTable.role, member.role),
      ),
    )
    .limit(1);

  const statements =
    (row?.permission ? parsePermissionStatements(row.permission) : null) ??
    builtInRoleStatements(member.role);

  return Boolean(statements && satisfies(statements, permissions));
}
