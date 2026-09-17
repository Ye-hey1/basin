import { and, eq, inArray, sql } from "drizzle-orm";
import db, { schema } from "../database";
import {
  ACCEPTANCE_STATUSES,
  type AcceptanceStatus,
  DEFAULT_REQUIREMENT_PRIORITY,
  DEFAULT_REQUIREMENT_STATUS,
  DEFAULT_REQUIREMENT_TYPE,
  REQUIREMENT_PRIORITIES,
  REQUIREMENT_SOURCES,
  REQUIREMENT_STATUSES,
  REQUIREMENT_TYPES,
  type RequirementPriority,
  type RequirementSource,
  type RequirementStatus,
  type RequirementType,
} from "./constants";
import type { RequirementTreeNode } from "./response";

// Columns are plain `text` so the database can't constrain them to the code
// sets. Values only ever arrive from Zod-validated input or a column default,
// but narrowing here keeps an out-of-band edit from leaking a value the
// response schema would reject.
function narrow<T extends string>(
  allowed: readonly T[],
  value: string | null,
  fallback: T,
): T {
  return value !== null && (allowed as readonly string[]).includes(value)
    ? (value as T)
    : fallback;
}

function narrowNullable<T extends string>(
  allowed: readonly T[],
  value: string | null,
): T | null {
  return value !== null && (allowed as readonly string[]).includes(value)
    ? (value as T)
    : null;
}

export const asStatus = (value: string | null): RequirementStatus =>
  narrow(REQUIREMENT_STATUSES, value, DEFAULT_REQUIREMENT_STATUS);

export const asPriority = (value: string | null): RequirementPriority =>
  narrow(REQUIREMENT_PRIORITIES, value, DEFAULT_REQUIREMENT_PRIORITY);

export const asType = (value: string | null): RequirementType =>
  narrow(REQUIREMENT_TYPES, value, DEFAULT_REQUIREMENT_TYPE);

export const asSource = (value: string | null): RequirementSource | null =>
  narrowNullable(REQUIREMENT_SOURCES, value);

export const asAcceptanceStatus = (value: string | null): AcceptanceStatus =>
  narrow(ACCEPTANCE_STATUSES, value, "pending");

export const requirementColumns = {
  id: schema.requirementTable.id,
  workspaceId: schema.requirementTable.workspaceId,
  parentId: schema.requirementTable.parentId,
  title: schema.requirementTable.title,
  description: schema.requirementTable.description,
  status: schema.requirementTable.status,
  priority: schema.requirementTable.priority,
  type: schema.requirementTable.type,
  source: schema.requirementTable.source,
  module: schema.requirementTable.module,
  assigneeId: schema.requirementTable.assigneeId,
  expectedDate: schema.requirementTable.expectedDate,
  createdBy: schema.requirementTable.createdBy,
  position: schema.requirementTable.position,
  createdAt: schema.requirementTable.createdAt,
  updatedAt: schema.requirementTable.updatedAt,
};

export type RequirementRow = {
  id: string;
  workspaceId: string;
  parentId: string | null;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  type: string;
  source: string | null;
  module: string | null;
  assigneeId: string | null;
  expectedDate: Date | null;
  createdBy: string | null;
  position: number | null;
  createdAt: Date;
  updatedAt: Date;
};

export type AcceptanceItemRow = {
  id: string;
  requirementId: string;
  title: string;
  criterion: string | null;
  status: string;
  note: string | null;
  verifiedBy: string | null;
  verifiedAt: Date | null;
  position: number | null;
  createdAt: Date;
  updatedAt: Date;
  verifiedByName: string | null;
};

export function mapAcceptanceItem(row: AcceptanceItemRow) {
  return {
    id: row.id,
    requirementId: row.requirementId,
    title: row.title,
    criterion: row.criterion,
    status: asAcceptanceStatus(row.status),
    note: row.note,
    verifiedBy: row.verifiedBy,
    verifiedByName: row.verifiedByName,
    verifiedAt: row.verifiedAt,
    position: row.position,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export type RequirementDocumentRow = {
  id: string;
  requirementId: string;
  title: string;
  position: number | null;
  createdBy: string | null;
  createdByName: string | null;
  currentVersion: number | null;
  versionCount: number;
  createdAt: Date;
  updatedAt: Date;
};

export function mapRequirementDocument(row: RequirementDocumentRow) {
  return {
    id: row.id,
    requirementId: row.requirementId,
    title: row.title,
    position: row.position,
    currentVersion: row.currentVersion,
    versionCount: row.versionCount,
    createdBy: row.createdBy,
    createdByName: row.createdByName,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

/**
 * Loads the project links, acceptance items, and assignee names for a set of
 * requirements in three queries rather than one per row, so listing a
 * workspace with hundreds of nodes stays a constant number of round trips.
 */
export async function hydrateRequirements(rows: RequirementRow[]) {
  if (rows.length === 0) {
    return [];
  }

  const requirementIds = rows.map((row) => row.id);

  const links = await db
    .select({
      requirementId: schema.requirementProjectTable.requirementId,
      projectId: schema.requirementProjectTable.projectId,
      projectName: schema.projectTable.name,
      isPrimary: schema.requirementProjectTable.isPrimary,
    })
    .from(schema.requirementProjectTable)
    .innerJoin(
      schema.projectTable,
      eq(schema.requirementProjectTable.projectId, schema.projectTable.id),
    )
    .where(
      inArray(schema.requirementProjectTable.requirementId, requirementIds),
    );

  const acceptanceItems = await db
    .select({
      id: schema.acceptanceItemTable.id,
      requirementId: schema.acceptanceItemTable.requirementId,
      title: schema.acceptanceItemTable.title,
      criterion: schema.acceptanceItemTable.criterion,
      status: schema.acceptanceItemTable.status,
      note: schema.acceptanceItemTable.note,
      verifiedBy: schema.acceptanceItemTable.verifiedBy,
      verifiedAt: schema.acceptanceItemTable.verifiedAt,
      position: schema.acceptanceItemTable.position,
      createdAt: schema.acceptanceItemTable.createdAt,
      updatedAt: schema.acceptanceItemTable.updatedAt,
      verifiedByName: schema.userTable.name,
    })
    .from(schema.acceptanceItemTable)
    .leftJoin(
      schema.userTable,
      eq(schema.acceptanceItemTable.verifiedBy, schema.userTable.id),
    )
    .where(inArray(schema.acceptanceItemTable.requirementId, requirementIds))
    .orderBy(schema.acceptanceItemTable.position);

  const assigneeIds = [
    ...new Set(
      rows
        .map((row) => row.assigneeId)
        .filter((id): id is string => typeof id === "string"),
    ),
  ];

  const assignees =
    assigneeIds.length > 0
      ? await db
          .select({ id: schema.userTable.id, name: schema.userTable.name })
          .from(schema.userTable)
          .where(inArray(schema.userTable.id, assigneeIds))
      : [];

  const assigneeNames = new Map(assignees.map((row) => [row.id, row.name]));
  const linksByRequirement = new Map<
    string,
    Array<{ projectId: string; projectName: string; isPrimary: boolean }>
  >();
  for (const link of links) {
    const bucket = linksByRequirement.get(link.requirementId) ?? [];
    bucket.push({
      projectId: link.projectId,
      projectName: link.projectName,
      isPrimary: link.isPrimary,
    });
    linksByRequirement.set(link.requirementId, bucket);
  }

  const itemsByRequirement = new Map<
    string,
    ReturnType<typeof mapAcceptanceItem>[]
  >();
  for (const item of acceptanceItems) {
    const bucket = itemsByRequirement.get(item.requirementId) ?? [];
    bucket.push(mapAcceptanceItem(item));
    itemsByRequirement.set(item.requirementId, bucket);
  }

  // One grouped query rather than one per row, so listing a workspace with
  // hundreds of requirements stays a constant number of round trips. The
  // column join is a left join on purpose: a task in a virtual status such as
  // `planned` has no column, and it must still count towards the total.
  const taskCountRows = await db
    .select({
      requirementId: schema.taskTable.requirementId,
      total: sql<number>`count(*)::int`,
      done: sql<number>`(count(*) filter (where coalesce(${schema.columnTable.isFinal}, false)))::int`,
    })
    .from(schema.taskTable)
    .leftJoin(
      schema.columnTable,
      eq(schema.taskTable.columnId, schema.columnTable.id),
    )
    .where(inArray(schema.taskTable.requirementId, requirementIds))
    .groupBy(schema.taskTable.requirementId);

  const taskCountsByRequirement = new Map(
    taskCountRows
      .filter(
        (row): row is { requirementId: string; total: number; done: number } =>
          row.requirementId !== null,
      )
      .map((row) => [row.requirementId, { total: row.total, done: row.done }]),
  );

  // Same reasoning as the task counts: one grouped query, so a workspace tree
  // can show which requirements carry a document without loading any of them.
  const documentCountRows = await db
    .select({
      requirementId: schema.requirementDocumentTable.requirementId,
      total: sql<number>`count(*)::int`,
    })
    .from(schema.requirementDocumentTable)
    .where(
      inArray(schema.requirementDocumentTable.requirementId, requirementIds),
    )
    .groupBy(schema.requirementDocumentTable.requirementId);

  const documentCountByRequirement = new Map(
    documentCountRows.map((row) => [row.requirementId, row.total]),
  );

  return rows.map((row) => ({
    id: row.id,
    workspaceId: row.workspaceId,
    parentId: row.parentId,
    title: row.title,
    description: row.description,
    status: asStatus(row.status),
    priority: asPriority(row.priority),
    type: asType(row.type),
    source: asSource(row.source),
    module: row.module,
    assigneeId: row.assigneeId,
    assigneeName: row.assigneeId
      ? (assigneeNames.get(row.assigneeId) ?? null)
      : null,
    expectedDate: row.expectedDate,
    createdBy: row.createdBy,
    position: row.position,
    projects: linksByRequirement.get(row.id) ?? [],
    acceptanceItems: itemsByRequirement.get(row.id) ?? [],
    documentCount: documentCountByRequirement.get(row.id) ?? 0,
    taskCounts: taskCountsByRequirement.get(row.id) ?? { total: 0, done: 0 },
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }));
}

export type HydratedRequirement = Awaited<
  ReturnType<typeof hydrateRequirements>
>[number];

/**
 * Nests a flat list into a forest. A node whose parent isn't in the same result
 * set is treated as a root, so filtering by project or status can never hide a
 * match just because its parent was filtered out.
 */
export function buildRequirementTree(
  nodes: HydratedRequirement[],
): RequirementTreeNode[] {
  const nodesById = new Map<string, RequirementTreeNode>();
  for (const node of nodes) {
    nodesById.set(node.id, { ...node, children: [] });
  }

  const roots: RequirementTreeNode[] = [];

  for (const node of nodes) {
    const current = nodesById.get(node.id);
    if (!current) continue;

    const parent = node.parentId ? nodesById.get(node.parentId) : undefined;
    if (parent && parent.id !== node.id) {
      parent.children.push(current);
    } else {
      roots.push(current);
    }
  }

  sortSiblings(roots);

  return roots;
}

function sortSiblings(siblings: RequirementTreeNode[]): void {
  siblings.sort((a, b) => {
    const positionDelta = (a.position ?? 0) - (b.position ?? 0);
    if (positionDelta !== 0) {
      return positionDelta;
    }
    return b.createdAt.getTime() - a.createdAt.getTime();
  });

  for (const sibling of siblings) {
    sortSiblings(sibling.children);
  }
}

/**
 * Resolves the projects a requirement relates to, ensuring every id really
 * belongs to the workspace. A cross-workspace id is reported as not found
 * rather than forbidden, so the response can't be used to probe for projects
 * outside the caller's workspace.
 */
export async function resolveProjectLinks(
  workspaceId: string,
  projectIds: string[],
  primaryProjectId: string | null | undefined,
) {
  const unique = [...new Set(projectIds)];
  if (unique.length === 0) {
    return [];
  }

  const projects = await db
    .select({ id: schema.projectTable.id })
    .from(schema.projectTable)
    .where(
      and(
        eq(schema.projectTable.workspaceId, workspaceId),
        inArray(schema.projectTable.id, unique),
      ),
    );

  const found = new Set(projects.map((project) => project.id));
  const missing = unique.filter((id) => !found.has(id));

  if (missing.length > 0) {
    return null;
  }

  const primary = primaryProjectId ?? unique[0] ?? null;
  if (primary && !found.has(primary)) {
    return null;
  }

  return unique.map((projectId) => ({
    projectId,
    isPrimary: projectId === primary,
  }));
}

export async function replaceProjectLinks(
  requirementId: string,
  links: Array<{ projectId: string; isPrimary: boolean }>,
) {
  await db
    .delete(schema.requirementProjectTable)
    .where(eq(schema.requirementProjectTable.requirementId, requirementId));

  if (links.length === 0) {
    return;
  }

  await db.insert(schema.requirementProjectTable).values(
    links.map((link) => ({
      requirementId,
      projectId: link.projectId,
      isPrimary: link.isPrimary,
    })),
  );
}

/**
 * Walks up from `startId` looking for `needle`. Used to reject a move that
 * would make a requirement its own ancestor, which the self-referencing
 * `parent_id` column cannot express as a constraint.
 */
export async function isDescendantOf(
  startId: string | null,
  needle: string,
): Promise<boolean> {
  let cursor = startId;
  const visited = new Set<string>();

  while (cursor) {
    if (cursor === needle) {
      return true;
    }
    if (visited.has(cursor)) {
      // Defensive: a cycle already in the data must not hang the request.
      return false;
    }
    visited.add(cursor);

    const [row] = await db
      .select({ parentId: schema.requirementTable.parentId })
      .from(schema.requirementTable)
      .where(eq(schema.requirementTable.id, cursor))
      .limit(1);

    cursor = row?.parentId ?? null;
  }

  return false;
}

export async function findRequirement(id: string) {
  const [row] = await db
    .select(requirementColumns)
    .from(schema.requirementTable)
    .where(eq(schema.requirementTable.id, id))
    .limit(1);

  return row ?? null;
}
