import {
  DEFAULT_ROLE_NAMES,
  type DefaultRoleName,
  defaultRolePayloads,
} from "@basin/permissions";
import { and, eq, inArray, sql } from "drizzle-orm";
import db, { schema } from "../database";

/**
 * Backfill the editable default roles (viewer/member/admin) for every
 * workspace that's missing them, and merge newly introduced permission
 * resources into rows that predate them. Runs on API startup after Drizzle
 * migrations.
 *
 * These three roles used to be static (compiled into better-auth's
 * `roles` config). They were converted to DB rows so admins can override
 * them per workspace, but that means existing workspaces, which were
 * created before the switch, have no rows yet. Without this backfill,
 * better-auth's dynamic-access-control resolution would treat them as
 * having an empty permission set on existing workspaces.
 *
 * The merge matters for the same reason one level down: the permission
 * check reads a workspace's stored payload before falling back to the
 * compiled defaults, so a resource added to `@basin/permissions` after a
 * row was written would never be granted on that workspace.
 *
 * Idempotent: only inserts rows that aren't already present, and only
 * rewrites a row when it was actually missing a resource.
 */
export async function seedDefaultWorkspaceRoles() {
  try {
    const tableExists = await db.execute(sql`
      SELECT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_name = 'workspace_role'
      ) AS exists;
    `);

    const exists =
      tableExists.rows[0]?.exists === true ||
      tableExists.rows[0]?.exists === "t";
    if (!exists) {
      console.log(
        "🛈 workspace_role table does not exist; skipping default-role seed.",
      );
      return;
    }

    const workspaces = await db
      .select({ id: schema.workspaceTable.id })
      .from(schema.workspaceTable);

    if (workspaces.length === 0) {
      return;
    }

    const workspaceIds = workspaces.map((w) => w.id);

    const existingRows = await db
      .select({
        workspaceId: schema.workspaceRoleTable.workspaceId,
        role: schema.workspaceRoleTable.role,
        permission: schema.workspaceRoleTable.permission,
      })
      .from(schema.workspaceRoleTable)
      .where(
        and(
          inArray(schema.workspaceRoleTable.workspaceId, workspaceIds),
          inArray(
            schema.workspaceRoleTable.role,
            DEFAULT_ROLE_NAMES as unknown as string[],
          ),
        ),
      );

    const present = new Set(
      existingRows.map((r) => `${r.workspaceId}:${r.role}`),
    );

    const now = new Date();
    const rows: Array<typeof schema.workspaceRoleTable.$inferInsert> = [];
    for (const workspaceId of workspaceIds) {
      for (const name of DEFAULT_ROLE_NAMES) {
        if (present.has(`${workspaceId}:${name}`)) continue;
        rows.push({
          workspaceId,
          role: name,
          permission: JSON.stringify(defaultRolePayloads[name]),
          createdAt: now,
          updatedAt: now,
        });
      }
    }

    // Postgres' bind protocol caps parameters at 65535 per query, so insert
    // in chunks. 6 columns × 1000 rows = 6000 params per batch, leaving ample
    // headroom even for instances with tens of thousands of workspaces.
    const BATCH_SIZE = 1000;
    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      await db
        .insert(schema.workspaceRoleTable)
        .values(rows.slice(i, i + BATCH_SIZE));
    }

    const updates = collectResourceMerges(existingRows);
    for (const update of updates) {
      await db
        .update(schema.workspaceRoleTable)
        .set({ permission: update.permission, updatedAt: now })
        .where(
          and(
            eq(schema.workspaceRoleTable.workspaceId, update.workspaceId),
            eq(schema.workspaceRoleTable.role, update.role),
          ),
        );
    }

    if (rows.length > 0) {
      console.log(
        `✅ Seeded ${rows.length} default workspace role row(s) across ${workspaceIds.length} workspace(s).`,
      );
    }

    if (updates.length > 0) {
      console.log(
        `✅ Merged new permission resources into ${updates.length} existing workspace role row(s).`,
      );
    }
  } catch (error) {
    console.error("❌ Failed to seed default workspace roles:", error);
    throw error;
  }
}

/**
 * A resource is only added when the row has never mentioned it. Anything the
 * row already declares — including a deliberately reduced action list — is
 * left exactly as the admin configured it.
 */
function collectResourceMerges(
  existingRows: Array<{
    workspaceId: string;
    role: string;
    permission: string;
  }>,
): Array<{ workspaceId: string; role: string; permission: string }> {
  const updates: Array<{
    workspaceId: string;
    role: string;
    permission: string;
  }> = [];

  for (const row of existingRows) {
    const defaults = defaultRolePayloads[row.role as DefaultRoleName];
    if (!defaults) {
      continue;
    }

    const current = parseStatements(row.permission);
    if (!current) {
      // A payload we can't understand is a payload we shouldn't rewrite.
      continue;
    }

    let changed = false;
    for (const [resource, actions] of Object.entries(defaults)) {
      if (current[resource]) {
        continue;
      }
      current[resource] = [...actions];
      changed = true;
    }

    if (changed) {
      updates.push({
        workspaceId: row.workspaceId,
        role: row.role,
        permission: JSON.stringify(current),
      });
    }
  }

  return updates;
}

function parseStatements(raw: string): Record<string, string[]> | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return null;
  }

  const out: Record<string, string[]> = {};
  for (const [resource, actions] of Object.entries(
    parsed as Record<string, unknown>,
  )) {
    if (
      Array.isArray(actions) &&
      actions.every((action) => typeof action === "string")
    ) {
      out[resource] = actions as string[];
    }
  }

  return out;
}
