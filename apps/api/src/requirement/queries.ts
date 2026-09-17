import { and, asc, desc, eq, exists, ilike, isNull, sql } from "drizzle-orm";
import db, { schema } from "../database";
import type { z } from "../openapi";
import type { requirementListQuery } from "./schema";

type RequirementListFilters = z.infer<typeof requirementListQuery>;

/**
 * Builds the shared `where` clause for every read path, so the tree, the flat
 * list, and the option picker can never drift apart in what they consider a
 * match.
 */
export function buildRequirementFilter(filters: RequirementListFilters) {
  const conditions = [
    eq(schema.requirementTable.workspaceId, filters.workspaceId),
  ];

  if (filters.status) {
    conditions.push(eq(schema.requirementTable.status, filters.status));
  }
  if (filters.priority) {
    conditions.push(eq(schema.requirementTable.priority, filters.priority));
  }
  if (filters.type) {
    conditions.push(eq(schema.requirementTable.type, filters.type));
  }
  if (filters.assigneeId) {
    conditions.push(eq(schema.requirementTable.assigneeId, filters.assigneeId));
  }
  if (filters.q) {
    // Titles are searched case-insensitively; the escape keeps a literal % or _
    // in the query from turning into a wildcard.
    const escaped = filters.q.replace(/[\\%_]/gu, (match) => `\\${match}`);
    conditions.push(ilike(schema.requirementTable.title, `%${escaped}%`));
  }
  if (filters.parentId) {
    conditions.push(
      filters.parentId === "root"
        ? isNull(schema.requirementTable.parentId)
        : eq(schema.requirementTable.parentId, filters.parentId),
    );
  }
  if (filters.projectId) {
    // A subquery rather than a join keeps a requirement from appearing once
    // per linked project.
    conditions.push(
      exists(
        db
          .select({ one: sql`1` })
          .from(schema.requirementProjectTable)
          .where(
            and(
              eq(
                schema.requirementProjectTable.requirementId,
                schema.requirementTable.id,
              ),
              eq(schema.requirementProjectTable.projectId, filters.projectId),
            ),
          ),
      ),
    );
  }

  return and(...conditions);
}

export const requirementOrder = [
  asc(schema.requirementTable.position),
  desc(schema.requirementTable.createdAt),
];
