import { and, eq, isNull } from "drizzle-orm";
import db, { schema } from "../../database";
import type { z } from "../../openapi";
import { httpError } from "../../utils/http-error";
import {
  DEFAULT_REQUIREMENT_PRIORITY,
  DEFAULT_REQUIREMENT_STATUS,
  DEFAULT_REQUIREMENT_TYPE,
} from "../constants";
import {
  findRequirement,
  hydrateRequirements,
  replaceProjectLinks,
  resolveProjectLinks,
} from "../mappers";
import type { createRequirementBody } from "../schema";

type CreateRequirementInput = z.infer<typeof createRequirementBody>;

/**
 * Creates a requirement, optionally under an existing parent. The parent and
 * every linked project must already belong to the caller's workspace; anything
 * else is reported as not found so the endpoint can't be used to probe for
 * resources elsewhere.
 */
async function createRequirement(
  input: CreateRequirementInput,
  userId: string,
) {
  const { workspaceId } = input;

  if (input.parentId) {
    const parent = await findRequirement(input.parentId);
    if (!parent || parent.workspaceId !== workspaceId) {
      throw httpError(
        404,
        "parent_requirement_not_found",
        "Parent requirement not found in this workspace",
      );
    }
  }

  if (input.assigneeId) {
    const [assignee] = await db
      .select({ id: schema.userTable.id })
      .from(schema.userTable)
      .where(eq(schema.userTable.id, input.assigneeId))
      .limit(1);

    if (!assignee) {
      throw httpError(404, "assignee_not_found", "Assignee not found");
    }
  }

  const links = await resolveProjectLinks(
    workspaceId,
    input.projectIds ?? [],
    input.primaryProjectId ?? undefined,
  );

  if (links === null) {
    throw httpError(
      404,
      "project_not_found",
      "One or more projects were not found in this workspace",
    );
  }

  const [inserted] = await db
    .insert(schema.requirementTable)
    .values({
      workspaceId,
      parentId: input.parentId ?? null,
      title: input.title.trim(),
      description: input.description ?? null,
      status: input.status ?? DEFAULT_REQUIREMENT_STATUS,
      priority: input.priority ?? DEFAULT_REQUIREMENT_PRIORITY,
      type: input.type ?? DEFAULT_REQUIREMENT_TYPE,
      source: input.source ?? null,
      module: input.module ?? null,
      assigneeId: input.assigneeId ?? null,
      expectedDate: parseExpectedDate(input.expectedDate),
      createdBy: userId,
      position: await nextSiblingPosition(workspaceId, input.parentId ?? null),
    })
    .returning({ id: schema.requirementTable.id });

  if (!inserted) {
    throw httpError(
      500,
      "failed_to_create_requirement",
      "Failed to create requirement",
    );
  }

  await replaceProjectLinks(inserted.id, links);

  const [hydrated] = await hydrateRequirements([
    await loadCreated(inserted.id),
  ]);

  if (!hydrated) {
    throw httpError(
      500,
      "failed_to_create_requirement",
      "Failed to create requirement",
    );
  }

  return hydrated;
}

async function loadCreated(id: string) {
  const row = await findRequirement(id);
  if (!row) {
    throw httpError(
      500,
      "failed_to_create_requirement",
      "Failed to create requirement",
    );
  }
  return row;
}

/**
 * Appends after the current last sibling so the ordering the caller sees after
 * a create matches the order they were created in.
 */
export async function nextSiblingPosition(
  workspaceId: string,
  parentId: string | null,
) {
  const rows = await db
    .select({ position: schema.requirementTable.position })
    .from(schema.requirementTable)
    .where(
      and(
        eq(schema.requirementTable.workspaceId, workspaceId),
        parentId
          ? eq(schema.requirementTable.parentId, parentId)
          : isNull(schema.requirementTable.parentId),
      ),
    );

  const max = rows.reduce((acc, row) => Math.max(acc, row.position ?? 0), -1);
  return max + 1;
}

export function parseExpectedDate(
  value: string | null | undefined,
): Date | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw httpError(
      400,
      "invalid_expected_date",
      "expectedDate must be a valid ISO 8601 date",
    );
  }
  return parsed;
}
export default createRequirement;
