import { eq, sql } from "drizzle-orm";
import db from "../../database";
import { columnTable } from "../../database/schema";
import { VIRTUAL_STATUSES } from "../../task/validate-task-fields";
import { httpError } from "../../utils/http-error";

export function toSlug(name: string): string {
  const slug = name
    .normalize("NFKC")
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{M}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "");

  return /[\p{L}\p{N}]/u.test(slug) ? slug : "";
}

async function createColumn({
  projectId,
  name,
  icon,
  color,
  isFinal,
}: {
  projectId: string;
  name: string;
  icon?: string;
  color?: string;
  isFinal?: boolean;
}) {
  const slug = toSlug(name);

  if (!slug) {
    throw httpError(
      400,
      "column_name_must_contain_at_least_one_alphanumeric_character",
      "Column name must contain at least one alphanumeric character",
    );
  }

  if ((VIRTUAL_STATUSES as readonly string[]).includes(slug)) {
    throw httpError(
      409,
      "column_slug_reserved",
      `Column slug "${slug}" is reserved for virtual task statuses`,
    );
  }

  const existing = await db
    .select({ id: columnTable.id })
    .from(columnTable)
    .where(
      sql`${columnTable.projectId} = ${projectId} AND ${columnTable.slug} = ${slug}`,
    );

  if (existing.length > 0) {
    throw httpError(
      409,
      "column_slug_exists",
      `Column with slug "${slug}" already exists in this project`,
    );
  }

  const [maxPos] = await db
    .select({
      maxPosition: sql<number>`COALESCE(MAX(${columnTable.position}), -1)`,
    })
    .from(columnTable)
    .where(eq(columnTable.projectId, projectId));

  const position = (maxPos?.maxPosition ?? -1) + 1;

  const [created] = await db
    .insert(columnTable)
    .values({
      projectId,
      name,
      slug,
      position,
      icon: icon || null,
      color: color || null,
      isFinal: isFinal ?? false,
    })
    .returning();

  if (!created) {
    throw httpError(500, "failed_to_create_column", "Failed to create column");
  }

  return created;
}

export default createColumn;
