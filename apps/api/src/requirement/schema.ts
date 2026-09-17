import { z } from "../openapi";
import {
  ACCEPTANCE_STATUSES,
  REQUIREMENT_PRIORITIES,
  REQUIREMENT_SOURCES,
  REQUIREMENT_STATUSES,
  REQUIREMENT_TYPES,
} from "./constants";

export const requirementIdParam = z.object({ id: z.string() });
export const acceptanceItemParam = z.object({ itemId: z.string() });

// `expectedDate` travels as an ISO date string because that is what the date
// picker produces; the controller converts it to a Date before it reaches
// Postgres.
const expectedDate = z
  .string()
  .min(1)
  .openapi({ description: "ISO 8601 date, for example 2026-12-31." });

const optionalNullableId = z.string().nullable().optional();

// Routes that address a single requirement or acceptance item resolve the
// workspace from the resource itself, with this query parameter as the fallback
// the access middleware uses when the id does not resolve. It has to be
// declared, not just read at runtime, or the typed client cannot send it.
export const workspaceIdQuery = z.object({
  workspaceId: z.string().optional(),
});

export const requirementListQuery = z.object({
  workspaceId: z.string().min(1),
  projectId: z.string().optional(),
  status: z.enum(REQUIREMENT_STATUSES).optional(),
  priority: z.enum(REQUIREMENT_PRIORITIES).optional(),
  type: z.enum(REQUIREMENT_TYPES).optional(),
  assigneeId: z.string().optional(),
  parentId: z.string().optional().openapi({
    description: "Requirement id, or `root` to return only top-level nodes.",
  }),
  q: z.string().optional(),
});

export const requirementOptionsQuery = z.object({
  workspaceId: z.string().min(1),
  excludeId: z.string().optional().openapi({
    description:
      "Excludes this requirement and its whole subtree, so a move can't reparent a node under itself.",
  }),
});

export const createRequirementBody = z.object({
  workspaceId: z.string().min(1),
  title: z.string().min(1),
  description: z.string().nullable().optional(),
  parentId: optionalNullableId,
  status: z.enum(REQUIREMENT_STATUSES).optional(),
  priority: z.enum(REQUIREMENT_PRIORITIES).optional(),
  type: z.enum(REQUIREMENT_TYPES).optional(),
  source: z.enum(REQUIREMENT_SOURCES).nullable().optional(),
  module: z.string().nullable().optional(),
  assigneeId: optionalNullableId,
  expectedDate: expectedDate.nullable().optional(),
  projectIds: z.array(z.string()).optional(),
  primaryProjectId: optionalNullableId,
});

export const updateRequirementBody = z.object({
  title: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  status: z.enum(REQUIREMENT_STATUSES).optional(),
  priority: z.enum(REQUIREMENT_PRIORITIES).optional(),
  type: z.enum(REQUIREMENT_TYPES).optional(),
  source: z.enum(REQUIREMENT_SOURCES).nullable().optional(),
  module: z.string().nullable().optional(),
  assigneeId: optionalNullableId,
  expectedDate: expectedDate.nullable().optional(),
  position: z.number().int().optional(),
  projectIds: z.array(z.string()).optional(),
  primaryProjectId: optionalNullableId,
});

export const updateRequirementStatusBody = z.object({
  status: z.enum(REQUIREMENT_STATUSES),
});

export const moveRequirementBody = z.object({
  targetId: optionalNullableId,
});

export const createChildRequirementsBody = z.object({
  titles: z.array(z.string().min(1)).min(1),
});

export const createAcceptanceItemBody = z.object({
  title: z.string().min(1),
  criterion: z.string().nullable().optional(),
  position: z.number().int().optional(),
});

export const updateAcceptanceItemBody = z.object({
  title: z.string().min(1).optional(),
  criterion: z.string().nullable().optional(),
  status: z.enum(ACCEPTANCE_STATUSES).optional(),
  note: z.string().nullable().optional(),
  position: z.number().int().optional(),
});

// Document-level routes address a document on its own, so its workspace is
// resolved from the document rather than from a requirement id the caller would
// have to repeat on every save.
export const requirementDocumentParam = z.object({
  documentId: z.string(),
});

export const requirementDocumentVersionParam = z.object({
  documentId: z.string(),
  version: z
    .string()
    .regex(/^\d+$/, "Expected a positive integer")
    .transform(Number)
    .pipe(z.number().int().min(1)),
});

export const createRequirementDocumentBody = z.object({
  title: z.string().min(1),
  content: z.string().optional().openapi({
    description: "Initial Markdown. Stored as version 1.",
  }),
  position: z.number().int().optional(),
});

export const updateRequirementDocumentBody = z.object({
  title: z.string().min(1).optional(),
  position: z.number().int().optional(),
});

export const saveRequirementDocumentBody = z.object({
  content: z.string().openapi({
    description:
      "The full Markdown body. Saving stores it as a new version; saving text identical to the current version stores nothing.",
  }),
});
