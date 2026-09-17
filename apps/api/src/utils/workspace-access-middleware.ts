import { and, eq, inArray } from "drizzle-orm";
import type { Context, Next } from "hono";
import db, { schema } from "../database";
import { httpError } from "./http-error";
import { validateWorkspaceAccess } from "./validate-workspace-access";

type LookupResource =
  | "project"
  | "task"
  | "label"
  | "timeEntry"
  | "activity"
  | "comment"
  | "column"
  | "workflowRule"
  | "customField"
  | "requirement"
  | "requirementDocument"
  | "acceptanceItem";

// A comment is an activity row, and the comment routes deliberately do not say
// whether a comment is missing or simply not the caller's. Both lookups answer
// with that same merged code so the middleware cannot contradict the route.
const COMMENT_NOT_FOUND = {
  code: "comment_not_found_or_you_are_not_the_author",
  message: "Comment not found or you are not the author",
};

// A looked-up id that resolves to nothing means the caller named a resource
// that does not exist, so the middleware answers 404 with that resource's own
// code rather than the generic 400 for an undeterminable workspace.
const NOT_FOUND_BY_RESOURCE: Record<
  LookupResource,
  { code: string; message: string }
> = {
  project: { code: "project_not_found", message: "Project not found" },
  task: { code: "task_not_found", message: "Task not found" },
  label: { code: "label_not_found", message: "Label not found" },
  requirementDocument: {
    code: "requirement_document_not_found",
    message: "Requirement document not found",
  },
  timeEntry: { code: "time_entry_not_found", message: "Time entry not found" },
  activity: COMMENT_NOT_FOUND,
  comment: COMMENT_NOT_FOUND,
  column: { code: "column_not_found", message: "Column not found" },
  workflowRule: {
    code: "workflow_rule_not_found",
    message: "Workflow rule not found",
  },
  customField: {
    code: "custom_field_not_found",
    message: "Custom field not found",
  },
  requirement: {
    code: "requirement_not_found",
    message: "Requirement not found",
  },
  acceptanceItem: {
    code: "acceptance_item_not_found",
    message: "Acceptance item not found",
  },
};

type WorkspaceIdSource =
  | { type: "query"; key: string }
  | { type: "body"; key: string }
  | { type: "param"; key: string }
  | {
      type: "lookup";
      resource: LookupResource;
      idKey: string;
    }
  | {
      type: "lookupMany";
      resource: "task";
      idKey: string;
    };

type WorkspaceAccessMiddlewareConfig = {
  sources: WorkspaceIdSource[];
};

async function readJsonObjectBody(
  c: Context,
): Promise<Record<string, unknown>> {
  const raw = (await c.req.json().catch(() => ({}))) || {};
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    return {};
  }
  return raw as Record<string, unknown>;
}

export function workspaceAccessMiddleware(
  config: WorkspaceAccessMiddlewareConfig,
) {
  return async (c: Context, next: Next) => {
    const userId = c.get("userId");

    if (!userId) {
      throw httpError(401, "unauthorized", "Unauthorized");
    }

    let workspaceId: string | null = null;
    let missingResource: LookupResource | null = null;

    for (const source of config.sources) {
      if (source.type === "query") {
        workspaceId = c.req.query(source.key) || null;
      } else if (source.type === "body") {
        const body = await readJsonObjectBody(c);
        const bodyValue = body[source.key];
        workspaceId = typeof bodyValue === "string" ? bodyValue : null;
      } else if (source.type === "param") {
        workspaceId = c.req.param(source.key) || null;
      } else if (source.type === "lookup") {
        const body = await readJsonObjectBody(c);
        const bodyId = body[source.idKey];
        const idFromBody = typeof bodyId === "string" ? bodyId : null;
        // Only accept the id from the same place the handler will read it
        // (path param or JSON body). Accepting it from the query string let a
        // caller authorize against one resource (`?taskId=<mine>`) while the
        // handler acted on another (`{"taskId": "<someone else's>"}`).
        const id = c.req.param(source.idKey) || idFromBody;
        if (id) {
          workspaceId = await lookupWorkspaceId(source.resource, id);
          if (!workspaceId && !missingResource) {
            missingResource = source.resource;
          }
        }
      } else if (source.type === "lookupMany") {
        const body = await readJsonObjectBody(c);
        const ids = body[source.idKey];
        if (Array.isArray(ids)) {
          const taskIds = ids.filter(
            (id): id is string => typeof id === "string",
          );
          if (taskIds.length > 0) {
            const tasks = await db
              .select({ workspaceId: schema.projectTable.workspaceId })
              .from(schema.taskTable)
              .innerJoin(
                schema.projectTable,
                eq(schema.taskTable.projectId, schema.projectTable.id),
              )
              .where(inArray(schema.taskTable.id, taskIds));
            const workspaceIds = [
              ...new Set(tasks.map((task) => task.workspaceId)),
            ];
            if (workspaceIds.length === 0) {
              throw httpError(404, "no_tasks_found", "No tasks found");
            }
            if (workspaceIds.length > 1) {
              throw httpError(
                400,
                "all_tasks_must_belong_to_the_same_workspace",
                "All tasks must belong to the same workspace",
              );
            }
            workspaceId = workspaceIds[0] ?? null;
          }
        }
      }

      if (workspaceId) {
        break;
      }
    }

    if (!workspaceId) {
      // A named resource that does not exist is a 404, not a 400: the request
      // was well formed and the workspace simply could not be derived from an
      // id that is genuinely absent. The 400 below stays for requests that
      // never named anything resolvable at all.
      if (missingResource) {
        const { code, message } = NOT_FOUND_BY_RESOURCE[missingResource];
        throw httpError(404, code, message);
      }
      throw httpError(
        400,
        "workspace_id_could_not_be_determined",
        "Workspace ID could not be determined",
      );
    }

    const apiKey = c.get("apiKey");
    const apiKeyId = apiKey?.id;

    await validateWorkspaceAccess(userId, workspaceId, apiKeyId);

    c.set("workspaceId", workspaceId);

    return next();
  };
}

async function lookupWorkspaceId(
  resource: LookupResource,
  id: string,
): Promise<string | null> {
  try {
    switch (resource) {
      case "project": {
        const [project] = await db
          .select({ workspaceId: schema.projectTable.workspaceId })
          .from(schema.projectTable)
          .where(eq(schema.projectTable.id, id))
          .limit(1);
        return project?.workspaceId || null;
      }

      case "task": {
        const [task] = await db
          .select({
            workspaceId: schema.projectTable.workspaceId,
          })
          .from(schema.taskTable)
          .innerJoin(
            schema.projectTable,
            eq(schema.taskTable.projectId, schema.projectTable.id),
          )
          .where(eq(schema.taskTable.id, id))
          .limit(1);
        return task?.workspaceId || null;
      }

      case "label": {
        const [label] = await db
          .select({ workspaceId: schema.labelTable.workspaceId })
          .from(schema.labelTable)
          .where(eq(schema.labelTable.id, id))
          .limit(1);
        return label?.workspaceId || null;
      }

      case "timeEntry": {
        const [timeEntry] = await db
          .select({
            workspaceId: schema.projectTable.workspaceId,
          })
          .from(schema.timeEntryTable)
          .innerJoin(
            schema.taskTable,
            eq(schema.timeEntryTable.taskId, schema.taskTable.id),
          )
          .innerJoin(
            schema.projectTable,
            eq(schema.taskTable.projectId, schema.projectTable.id),
          )
          .where(eq(schema.timeEntryTable.id, id))
          .limit(1);
        return timeEntry?.workspaceId || null;
      }

      case "activity": {
        const [activity] = await db
          .select({
            workspaceId: schema.projectTable.workspaceId,
          })
          .from(schema.activityTable)
          .innerJoin(
            schema.taskTable,
            eq(schema.activityTable.taskId, schema.taskTable.id),
          )
          .innerJoin(
            schema.projectTable,
            eq(schema.taskTable.projectId, schema.projectTable.id),
          )
          .where(eq(schema.activityTable.id, id))
          .limit(1);
        return activity?.workspaceId || null;
      }

      case "comment": {
        const [comment] = await db
          .select({
            workspaceId: schema.projectTable.workspaceId,
          })
          .from(schema.activityTable)
          .innerJoin(
            schema.taskTable,
            eq(schema.activityTable.taskId, schema.taskTable.id),
          )
          .innerJoin(
            schema.projectTable,
            eq(schema.taskTable.projectId, schema.projectTable.id),
          )
          .where(
            and(
              eq(schema.activityTable.id, id),
              eq(schema.activityTable.type, "comment"),
            ),
          )
          .limit(1);
        return comment?.workspaceId || null;
      }

      case "column": {
        const [column] = await db
          .select({
            workspaceId: schema.projectTable.workspaceId,
          })
          .from(schema.columnTable)
          .innerJoin(
            schema.projectTable,
            eq(schema.columnTable.projectId, schema.projectTable.id),
          )
          .where(eq(schema.columnTable.id, id))
          .limit(1);
        return column?.workspaceId || null;
      }

      case "workflowRule": {
        const [workflowRule] = await db
          .select({
            workspaceId: schema.projectTable.workspaceId,
          })
          .from(schema.workflowRuleTable)
          .innerJoin(
            schema.projectTable,
            eq(schema.workflowRuleTable.projectId, schema.projectTable.id),
          )
          .where(eq(schema.workflowRuleTable.id, id))
          .limit(1);
        return workflowRule?.workspaceId || null;
      }

      case "customField": {
        const [field] = await db
          .select({
            workspaceId: schema.projectTable.workspaceId,
          })
          .from(schema.customFieldDefinitionTable)
          .innerJoin(
            schema.projectTable,
            eq(
              schema.customFieldDefinitionTable.projectId,
              schema.projectTable.id,
            ),
          )
          .where(eq(schema.customFieldDefinitionTable.id, id))
          .limit(1);
        return field?.workspaceId || null;
      }

      case "requirement": {
        const [requirement] = await db
          .select({ workspaceId: schema.requirementTable.workspaceId })
          .from(schema.requirementTable)
          .where(eq(schema.requirementTable.id, id))
          .limit(1);
        return requirement?.workspaceId || null;
      }

      case "acceptanceItem": {
        const [item] = await db
          .select({ workspaceId: schema.requirementTable.workspaceId })
          .from(schema.acceptanceItemTable)
          .innerJoin(
            schema.requirementTable,
            eq(
              schema.acceptanceItemTable.requirementId,
              schema.requirementTable.id,
            ),
          )
          .where(eq(schema.acceptanceItemTable.id, id))
          .limit(1);
        return item?.workspaceId || null;
      }

      case "requirementDocument": {
        const [row] = await db
          .select({ workspaceId: schema.requirementTable.workspaceId })
          .from(schema.requirementDocumentTable)
          .innerJoin(
            schema.requirementTable,
            eq(
              schema.requirementDocumentTable.requirementId,
              schema.requirementTable.id,
            ),
          )
          .where(eq(schema.requirementDocumentTable.id, id))
          .limit(1);
        return row?.workspaceId || null;
      }
      default:
        return null;
    }
  } catch (error) {
    // A failed lookup is not a missing resource. Swallowing the error here would
    // report an existing resource as absent on a transient database failure, so
    // it is rethrown and answered as a 500 by the global error handler.
    console.error(`Error looking up workspaceId for ${resource}:`, error);
    throw error;
  }
}

export const workspaceAccess = {
  fromQuery: (key = "workspaceId") =>
    workspaceAccessMiddleware({ sources: [{ type: "query", key }] }),

  fromBody: (key = "workspaceId") =>
    workspaceAccessMiddleware({ sources: [{ type: "body", key }] }),

  fromParam: (key = "workspaceId") =>
    workspaceAccessMiddleware({ sources: [{ type: "param", key }] }),

  fromProject: (idKey = "id") =>
    workspaceAccessMiddleware({
      sources: [{ type: "lookup", resource: "project", idKey }],
    }),

  fromTask: (idKey = "id") =>
    workspaceAccessMiddleware({
      sources: [
        { type: "lookup", resource: "task", idKey },
        { type: "query", key: "workspaceId" },
      ],
    }),

  fromTaskId: (idKey = "taskId") =>
    workspaceAccessMiddleware({
      sources: [
        { type: "lookup", resource: "task", idKey },
        { type: "query", key: "workspaceId" },
      ],
    }),

  fromTasks: (idKey = "taskIds") =>
    workspaceAccessMiddleware({
      sources: [{ type: "lookupMany", resource: "task", idKey }],
    }),

  fromLabel: (idKey = "id") =>
    workspaceAccessMiddleware({
      sources: [
        { type: "lookup", resource: "label", idKey },
        { type: "query", key: "workspaceId" },
      ],
    }),
  fromTimeEntry: (idKey = "id") =>
    workspaceAccessMiddleware({
      sources: [
        { type: "lookup", resource: "timeEntry", idKey },
        { type: "query", key: "workspaceId" },
      ],
    }),

  fromActivity: (idKey = "id") =>
    workspaceAccessMiddleware({
      sources: [
        { type: "lookup", resource: "activity", idKey },
        { type: "query", key: "workspaceId" },
      ],
    }),

  fromComment: (idKey = "id") =>
    workspaceAccessMiddleware({
      sources: [
        { type: "lookup", resource: "comment", idKey },
        { type: "query", key: "workspaceId" },
      ],
    }),

  fromColumn: (idKey = "id") =>
    workspaceAccessMiddleware({
      sources: [
        { type: "lookup", resource: "column", idKey },
        { type: "query", key: "workspaceId" },
      ],
    }),

  fromWorkflowRule: (idKey = "id") =>
    workspaceAccessMiddleware({
      sources: [
        { type: "lookup", resource: "workflowRule", idKey },
        { type: "query", key: "workspaceId" },
      ],
    }),

  fromCustomField: (idKey = "id") =>
    workspaceAccessMiddleware({
      sources: [{ type: "lookup", resource: "customField", idKey }],
    }),

  fromProjectId: (idKey = "projectId") =>
    workspaceAccessMiddleware({
      sources: [
        { type: "lookup", resource: "project", idKey },
        { type: "query", key: "workspaceId" },
      ],
    }),

  fromRequirement: (idKey = "id") =>
    workspaceAccessMiddleware({
      sources: [
        { type: "lookup", resource: "requirement", idKey },
        { type: "query", key: "workspaceId" },
      ],
    }),

  fromAcceptanceItem: (idKey = "itemId") =>
    workspaceAccessMiddleware({
      sources: [
        { type: "lookup", resource: "acceptanceItem", idKey },
        { type: "query", key: "workspaceId" },
      ],
    }),

  fromRequirementDocument: (idKey = "documentId") =>
    workspaceAccessMiddleware({
      sources: [
        { type: "lookup", resource: "requirementDocument", idKey },
        { type: "query", key: "workspaceId" },
      ],
    }),
};
