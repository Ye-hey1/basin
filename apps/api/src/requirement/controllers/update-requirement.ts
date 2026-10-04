import { and, eq, ne } from "drizzle-orm";
import db, { schema } from "../../database";
import { publishEvent } from "../../events";
import type { z } from "../../openapi";
import { httpError } from "../../utils/http-error";
import {
  findRequirement,
  hydrateRequirements,
  replaceProjectLinks,
  resolveProjectLinks,
} from "../mappers";
import type { updateRequirementBody } from "../schema";
import { parseExpectedDate } from "./create-requirement";
import { loadOr404 } from "./get-requirement";

type UpdateRequirementInput = z.infer<typeof updateRequirementBody>;

/**
 * Applies a partial update. Only the keys the caller actually sent are touched,
 * so a PATCH that renames a requirement can't silently clear its description.
 */
async function updateRequirement(id: string, input: UpdateRequirementInput) {
  const existing = await loadOr404(id);

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

  const patch: Partial<typeof schema.requirementTable.$inferInsert> = {};

  if (input.title !== undefined) {
    patch.title = input.title.trim();
  }
  if (input.description !== undefined) {
    patch.description = input.description;
  }

  if (input.status !== undefined) {
    patch.status = input.status;
  }
  if (input.priority !== undefined) {
    patch.priority = input.priority;
  }
  if (input.type !== undefined) {
    patch.type = input.type;
  }
  if (input.source !== undefined) {
    patch.source = input.source;
  }
  if (input.module !== undefined) {
    patch.module = input.module;
  }
  if (input.assigneeId !== undefined) {
    patch.assigneeId = input.assigneeId;
  }
  if (input.expectedDate !== undefined) {
    patch.expectedDate = parseExpectedDate(input.expectedDate);
  }
  if (input.position !== undefined) {
    patch.position = input.position;
  }

  if (Object.keys(patch).length > 0) {
    await db
      .update(schema.requirementTable)
      .set(patch)
      .where(eq(schema.requirementTable.id, id));
  }

  if (input.projectIds !== undefined) {
    const links = await resolveProjectLinks(
      existing.workspaceId,
      input.projectIds,
      input.primaryProjectId ?? undefined,
    );

    if (links === null) {
      throw httpError(
        404,
        "project_not_found",
        "One or more projects were not found in this workspace",
      );
    }

    await replaceProjectLinks(id, links);
  } else if (input.primaryProjectId !== undefined) {
    await repointPrimaryProject(
      id,
      existing.workspaceId,
      input.primaryProjectId ?? null,
    );
  }

  const updated = await findRequirement(id);
  if (!updated) {
    throw httpError(404, "requirement_not_found", "Requirement not found");
  }

  const [hydrated] = await hydrateRequirements([updated]);
  if (!hydrated) {
    throw httpError(404, "requirement_not_found", "Requirement not found");
  }

  await publishEvent("requirement.updated", { requirementId: id });

  return hydrated;
}

/**
 * Flips which linked project is primary without touching the rest of the set.
 * Clearing the primary is allowed; the requirement simply keeps its links.
 */
async function repointPrimaryProject(
  requirementId: string,
  workspaceId: string,
  primaryProjectId: string | null,
) {
  if (primaryProjectId) {
    const links = await resolveProjectLinks(
      workspaceId,
      [primaryProjectId],
      primaryProjectId,
    );
    if (links === null) {
      throw httpError(404, "project_not_found", "Project not found");
    }
  }

  await db
    .update(schema.requirementProjectTable)
    .set({ isPrimary: false })
    .where(eq(schema.requirementProjectTable.requirementId, requirementId));

  if (!primaryProjectId) {
    return;
  }

  const result = await db
    .update(schema.requirementProjectTable)
    .set({ isPrimary: true })
    .where(
      and(
        eq(schema.requirementProjectTable.requirementId, requirementId),
        eq(schema.requirementProjectTable.projectId, primaryProjectId),
      ),
    )
    .returning({ id: schema.requirementProjectTable.id });

  if (result.length === 0) {
    throw httpError(
      400,
      "primary_project_not_linked",
      "The primary project must also be one of the requirement's projects",
    );
  }
}

/** Status-only update, kept separate so the board can move one field cheaply. */
export async function updateRequirementStatus(
  id: string,
  status: NonNullable<UpdateRequirementInput["status"]>,
) {
  await loadOr404(id);

  await db
    .update(schema.requirementTable)
    .set({ status })
    .where(eq(schema.requirementTable.id, id));

  const updated = await findRequirement(id);
  if (!updated) {
    throw httpError(404, "requirement_not_found", "Requirement not found");
  }

  const [hydrated] = await hydrateRequirements([updated]);
  if (!hydrated) {
    throw httpError(404, "requirement_not_found", "Requirement not found");
  }

  return hydrated;
}

/** True when the workspace already has a different requirement with this title. */
export async function titleTaken(
  workspaceId: string,
  title: string,
  excludeId?: string,
) {
  const conditions = [
    eq(schema.requirementTable.workspaceId, workspaceId),
    eq(schema.requirementTable.title, title),
  ];
  if (excludeId) {
    conditions.push(ne(schema.requirementTable.id, excludeId));
  }

  const [row] = await db
    .select({ id: schema.requirementTable.id })
    .from(schema.requirementTable)
    .where(and(...conditions))
    .limit(1);

  return Boolean(row);
}

export default updateRequirement;
