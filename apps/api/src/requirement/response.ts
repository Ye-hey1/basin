import { nullableResponseTimestamp, responseTimestamp, z } from "../openapi";
import {
  ACCEPTANCE_STATUSES,
  REQUIREMENT_PRIORITIES,
  REQUIREMENT_SOURCES,
  REQUIREMENT_STATUSES,
  REQUIREMENT_TYPES,
} from "./constants";

export const acceptanceItemSchema = z
  .object({
    id: z.string(),
    requirementId: z.string(),
    title: z.string(),
    criterion: z.string().nullable(),
    status: z.enum(ACCEPTANCE_STATUSES),
    note: z.string().nullable(),
    verifiedBy: z.string().nullable(),
    verifiedByName: z.string().nullable(),
    verifiedAt: responseTimestamp.nullable(),
    position: z.number().nullable(),
    createdAt: responseTimestamp,
    updatedAt: responseTimestamp,
  })
  .openapi("AcceptanceItem");

export const acceptanceItemListSchema = z.array(acceptanceItemSchema);

export const requirementProjectLinkSchema = z
  .object({
    projectId: z.string(),
    projectName: z.string(),
    isPrimary: z.boolean(),
  })
  .openapi("RequirementProjectLink");

export const requirementSchema = z
  .object({
    id: z.string(),
    workspaceId: z.string(),
    parentId: z.string().nullable(),
    title: z.string(),
    description: z.string().nullable(),
    status: z.enum(REQUIREMENT_STATUSES),
    priority: z.enum(REQUIREMENT_PRIORITIES),
    type: z.enum(REQUIREMENT_TYPES),
    source: z.enum(REQUIREMENT_SOURCES).nullable(),
    module: z.string().nullable(),
    assigneeId: z.string().nullable(),
    assigneeName: z.string().nullable(),
    expectedDate: responseTimestamp.nullable(),
    createdBy: z.string().nullable(),
    position: z.number().nullable(),
    projects: z.array(requirementProjectLinkSchema),
    acceptanceItems: z.array(acceptanceItemSchema),
    documentCount: z.number().openapi({
      description:
        "Requirement documents attached to this node. Counted by the database so the tree can show which requirements have a document without loading one.",
    }),
    taskCounts: z
      .object({
        total: z.number(),
        done: z.number(),
      })
      .openapi({
        description:
          "Tasks linked to this requirement, and how many of them sit in a final column. Aggregated by the database so a requirement tree never has to load its tasks to show progress.",
      }),
    createdAt: responseTimestamp,
    updatedAt: responseTimestamp,
  })
  .openapi("Requirement");

export const requirementListSchema = z.array(requirementSchema);

export const requirementTaskSchema = z
  .object({
    id: z.string(),
    title: z.string(),
    number: z.number().nullable(),
    status: z.string(),
    priority: z.string(),
    projectId: z.string(),
    projectName: z.string(),
    assigneeName: z.string().nullable(),
    dueDate: nullableResponseTimestamp,
    isFinal: z.boolean().openapi({
      description: "Whether the task sits in a column marked final.",
    }),
    createdAt: responseTimestamp,
  })
  .openapi("RequirementTask");

export const requirementTaskListSchema = z.array(requirementTaskSchema);

// The tree shape repeats itself to an arbitrary depth, so the schema is
// declared lazily. This is what lets a single response describe a whole PRD
// breakdown without the client having to stitch pages together.
export type RequirementTreeNode = z.infer<typeof requirementSchema> & {
  children: RequirementTreeNode[];
};

export const requirementTreeNodeSchema: z.ZodType<RequirementTreeNode> = z
  .lazy(() =>
    requirementSchema.extend({
      children: z.array(requirementTreeNodeSchema),
    }),
  )
  .openapi("RequirementTreeNode");

export const requirementTreeSchema = z.array(requirementTreeNodeSchema);

export const requirementOptionSchema = z
  .object({
    id: z.string(),
    title: z.string(),
    parentId: z.string().nullable(),
    depth: z.number(),
  })
  .openapi("RequirementOption");

export const requirementOptionListSchema = z.array(requirementOptionSchema);

export const requirementDetailSchema = requirementSchema
  .extend({
    parentTitle: z.string().nullable(),
  })
  .openapi("RequirementDetail");

export const requirementDeleteResultSchema = z
  .object({ success: z.boolean(), message: z.string() })
  .openapi("RequirementDeleteResult");

export const requirementDocumentVersionSummarySchema = z
  .object({
    version: z.number(),
    createdBy: z.string().nullable(),
    createdByName: z.string().nullable(),
    createdAt: responseTimestamp,
  })
  .openapi("RequirementDocumentVersionSummary");

export const requirementDocumentSchema = z
  .object({
    id: z.string(),
    requirementId: z.string(),
    title: z.string(),
    position: z.number().nullable(),
    // The current text is the highest version; a document carries no content
    // column of its own, so these two can never disagree with the history.
    currentVersion: z.number().nullable(),
    versionCount: z.number(),
    createdBy: z.string().nullable(),
    createdByName: z.string().nullable(),
    createdAt: responseTimestamp,
    updatedAt: responseTimestamp,
  })
  .openapi("RequirementDocument");

export const requirementDocumentListSchema = z.array(requirementDocumentSchema);

export const requirementDocumentDetailSchema = requirementDocumentSchema
  .extend({
    content: z.string().openapi({
      description:
        "The Markdown of the current version, empty when there is none.",
    }),
    versions: z.array(requirementDocumentVersionSummarySchema),
  })
  .openapi("RequirementDocumentDetail");

export const requirementDocumentVersionSchema = z
  .object({
    documentId: z.string(),
    version: z.number(),
    content: z.string(),
    createdBy: z.string().nullable(),
    createdByName: z.string().nullable(),
    createdAt: responseTimestamp,
  })
  .openapi("RequirementDocumentVersion");
