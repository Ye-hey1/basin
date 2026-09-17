import {
  apiRouter,
  type BaseVariables,
  createRoute,
  errorResponse,
  jsonResponse,
  z,
} from "../openapi";
import { requireWorkspacePermission } from "../utils/require-workspace-permission";
import { workspaceAccess } from "../utils/workspace-access-middleware";
import {
  createAcceptanceItem,
  deleteAcceptanceItem,
  listAcceptanceItems,
  updateAcceptanceItem,
} from "./controllers/acceptance-items";
import createChildRequirements from "./controllers/create-child-requirements";
import createRequirement from "./controllers/create-requirement";
import deleteRequirement from "./controllers/delete-requirement";
import {
  createRequirementDocument,
  deleteRequirementDocument,
  getRequirementDocument,
  getRequirementDocumentVersion,
  listRequirementDocuments,
  saveRequirementDocumentContent,
  updateRequirementDocument,
} from "./controllers/documents";
import getRequirement from "./controllers/get-requirement";
import getRequirementOptions from "./controllers/get-requirement-options";
import getRequirementTasks from "./controllers/get-requirement-tasks";
import getRequirementTree from "./controllers/get-requirement-tree";
import listRequirements from "./controllers/list-requirements";
import moveRequirement from "./controllers/move-requirement";
import updateRequirement, {
  updateRequirementStatus,
} from "./controllers/update-requirement";
import {
  acceptanceItemListSchema,
  acceptanceItemSchema,
  requirementDeleteResultSchema,
  requirementDetailSchema,
  requirementDocumentDetailSchema,
  requirementDocumentListSchema,
  requirementDocumentVersionSchema,
  requirementListSchema,
  requirementOptionListSchema,
  requirementSchema,
  requirementTaskListSchema,
  requirementTreeSchema,
} from "./response";
import {
  acceptanceItemParam,
  createAcceptanceItemBody,
  createChildRequirementsBody,
  createRequirementBody,
  createRequirementDocumentBody,
  moveRequirementBody,
  requirementDocumentParam,
  requirementDocumentVersionParam,
  requirementIdParam,
  requirementListQuery,
  requirementOptionsQuery,
  saveRequirementDocumentBody,
  updateAcceptanceItemBody,
  updateRequirementBody,
  updateRequirementDocumentBody,
  updateRequirementStatusBody,
  workspaceIdQuery,
} from "./schema";

const deletedSchema = z.object({ success: z.boolean() });

const listRoute = createRoute({
  method: "get",
  operationId: "listRequirements",
  path: "/",
  tags: ["Requirements"],
  summary: "List requirements",
  description:
    "Every requirement in the workspace that matches the filters, returned flat. Use the tree route when the hierarchy matters.",
  middleware: [
    workspaceAccess.fromQuery("workspaceId"),
    requireWorkspacePermission({ requirement: ["read"] }),
  ] as const,
  request: { query: requirementListQuery },
  responses: {
    200: jsonResponse("Matching requirements", requirementListSchema),
    400: errorResponse(
      "Invalid query, or workspace ID could not be determined",
    ),
    403: errorResponse("No workspace access, or missing requirement:read"),
  },
});

const treeRoute = createRoute({
  method: "get",
  operationId: "getRequirementTree",
  path: "/tree",
  tags: ["Requirements"],
  summary: "Get requirement tree",
  description:
    "The workspace's requirements nested by parent, top-level nodes first. A node whose parent was filtered out is surfaced as a root rather than dropped.",
  middleware: [
    workspaceAccess.fromQuery("workspaceId"),
    requireWorkspacePermission({ requirement: ["read"] }),
  ] as const,
  request: { query: requirementListQuery },
  responses: {
    200: jsonResponse("Nested requirements", requirementTreeSchema),
    400: errorResponse(
      "Invalid query, or workspace ID could not be determined",
    ),
    403: errorResponse("No workspace access, or missing requirement:read"),
  },
});

const optionsRoute = createRoute({
  method: "get",
  operationId: "getRequirementOptions",
  path: "/options",
  tags: ["Requirements"],
  summary: "List requirement options",
  description:
    "Id, title, and depth for every requirement in the workspace, for the parent picker. Pass excludeId to drop a requirement and its whole subtree so it cannot be reparented under itself.",
  middleware: [
    workspaceAccess.fromQuery("workspaceId"),
    requireWorkspacePermission({ requirement: ["read"] }),
  ] as const,
  request: { query: requirementOptionsQuery },
  responses: {
    200: jsonResponse("Selectable parents", requirementOptionListSchema),
    400: errorResponse(
      "Invalid query, or workspace ID could not be determined",
    ),
    403: errorResponse("No workspace access, or missing requirement:read"),
  },
});

const getRoute = createRoute({
  method: "get",
  operationId: "getRequirement",
  path: "/{id}",
  tags: ["Requirements"],
  summary: "Get requirement",
  description:
    "One requirement with its linked projects, acceptance criteria, and parent title.",
  middleware: [
    workspaceAccess.fromRequirement(),
    requireWorkspacePermission({ requirement: ["read"] }),
  ] as const,
  request: { params: requirementIdParam, query: workspaceIdQuery },
  responses: {
    200: jsonResponse("Requirement details", requirementDetailSchema),
    400: errorResponse("The workspace could not be determined"),
    404: errorResponse("Unknown requirement"),
    403: errorResponse("No access to the requirement's workspace"),
  },
});

const createRouteDefinition = createRoute({
  method: "post",
  operationId: "createRequirement",
  path: "/",
  tags: ["Requirements"],
  summary: "Create requirement",
  description:
    "Create a requirement, optionally under an existing parent. Status defaults to pending_review, priority to P2, and type to feature.",
  middleware: [
    workspaceAccess.fromBody("workspaceId"),
    requireWorkspacePermission({ requirement: ["create"] }),
  ] as const,
  request: {
    body: {
      required: true,
      content: { "application/json": { schema: createRequirementBody } },
    },
  },
  responses: {
    200: jsonResponse("The created requirement", requirementSchema),
    400: errorResponse("Invalid body, or workspace ID could not be determined"),
    403: errorResponse(
      "No workspace access, or missing requirement:create permission",
    ),
    404: errorResponse(
      "The parent requirement or a linked project was not found",
    ),
  },
});

const updateRoute = createRoute({
  method: "patch",
  operationId: "updateRequirement",
  path: "/{id}",
  tags: ["Requirements"],
  summary: "Update requirement",
  description:
    "Update the supplied fields only. Sending projectIds replaces the requirement's project links; sending primaryProjectId alone flips which existing link is primary.",
  middleware: [
    workspaceAccess.fromRequirement(),
    requireWorkspacePermission({ requirement: ["update"] }),
  ] as const,
  request: {
    params: requirementIdParam,
    query: workspaceIdQuery,
    body: {
      required: true,
      content: { "application/json": { schema: updateRequirementBody } },
    },
  },
  responses: {
    200: jsonResponse("The updated requirement", requirementSchema),
    400: errorResponse("Invalid body"),
    403: errorResponse(
      "No workspace access, or missing requirement:update permission",
    ),
    404: errorResponse("The requirement or a linked project was not found"),
  },
});

const deleteRoute = createRoute({
  method: "delete",
  operationId: "deleteRequirement",
  path: "/{id}",
  tags: ["Requirements"],
  summary: "Delete requirement",
  description:
    "Delete a requirement. Refused with 409 while it still has sub-requirements, so a subtree is never removed by accident.",
  middleware: [
    workspaceAccess.fromRequirement(),
    requireWorkspacePermission({ requirement: ["delete"] }),
  ] as const,
  request: { params: requirementIdParam, query: workspaceIdQuery },
  responses: {
    200: jsonResponse(
      "The requirement was removed",
      requirementDeleteResultSchema,
    ),
    400: errorResponse("The workspace could not be determined"),
    404: errorResponse("Unknown requirement"),
    403: errorResponse(
      "No workspace access, or missing requirement:delete permission",
    ),
    409: errorResponse("The requirement still has sub-requirements"),
  },
});

const statusRoute = createRoute({
  method: "post",
  operationId: "updateRequirementStatus",
  path: "/{id}/status",
  tags: ["Requirements"],
  summary: "Update requirement status",
  description:
    "Move a requirement to a new status. Unlike a task board, requirement status does not have to advance in order.",
  middleware: [
    workspaceAccess.fromRequirement(),
    requireWorkspacePermission({ requirement: ["update"] }),
  ] as const,
  request: {
    params: requirementIdParam,
    query: workspaceIdQuery,
    body: {
      required: true,
      content: { "application/json": { schema: updateRequirementStatusBody } },
    },
  },
  responses: {
    200: jsonResponse("The updated requirement", requirementSchema),
    400: errorResponse("Invalid body"),
    404: errorResponse("Unknown requirement"),
    403: errorResponse(
      "No workspace access, or missing requirement:update permission",
    ),
  },
});

const moveRoute = createRoute({
  method: "post",
  operationId: "moveRequirement",
  path: "/{id}/move",
  tags: ["Requirements"],
  summary: "Move requirement",
  description:
    "Reparent a requirement, or move it to the top level by sending a null targetId. Cycles are rejected.",
  middleware: [
    workspaceAccess.fromRequirement(),
    requireWorkspacePermission({ requirement: ["update"] }),
  ] as const,
  request: {
    params: requirementIdParam,
    query: workspaceIdQuery,
    body: {
      required: true,
      content: { "application/json": { schema: moveRequirementBody } },
    },
  },
  responses: {
    200: jsonResponse("The moved requirement", requirementSchema),
    400: errorResponse("Invalid body, or the move would create a cycle"),
    403: errorResponse(
      "No workspace access, or missing requirement:update permission",
    ),
    404: errorResponse(
      "Unknown requirement, or the target requirement was not found",
    ),
  },
});

const childrenRoute = createRoute({
  method: "post",
  operationId: "createChildRequirements",
  path: "/{id}/children",
  tags: ["Requirements"],
  summary: "Create sub-requirements",
  description:
    "Create several sub-requirements under one parent in a single call, inheriting the parent's priority and type.",
  middleware: [
    workspaceAccess.fromRequirement(),
    requireWorkspacePermission({ requirement: ["create"] }),
  ] as const,
  request: {
    params: requirementIdParam,
    query: workspaceIdQuery,
    body: {
      required: true,
      content: { "application/json": { schema: createChildRequirementsBody } },
    },
  },
  responses: {
    200: jsonResponse("The created sub-requirements", requirementListSchema),
    400: errorResponse("Invalid body"),
    404: errorResponse("Unknown requirement"),
    403: errorResponse(
      "No workspace access, or missing requirement:create permission",
    ),
  },
});

const tasksRoute = createRoute({
  method: "get",
  operationId: "listRequirementTasks",
  path: "/{id}/tasks",
  tags: ["Requirements"],
  summary: "List tasks for a requirement",
  description:
    "Tasks linked to this requirement across every project in the workspace, newest position first. Kept here rather than on the task list route because a requirement spans projects.",
  middleware: [
    workspaceAccess.fromRequirement(),
    requireWorkspacePermission({ requirement: ["read"] }),
  ] as const,
  request: { params: requirementIdParam, query: workspaceIdQuery },
  responses: {
    200: jsonResponse(
      "Tasks linked to the requirement",
      requirementTaskListSchema,
    ),
    400: errorResponse("The workspace could not be determined"),
    404: errorResponse("Unknown requirement"),
    403: errorResponse("No access to the requirement's workspace"),
  },
});
const listAcceptanceRoute = createRoute({
  method: "get",
  operationId: "listAcceptanceItems",
  path: "/{id}/acceptance-items",
  tags: ["Requirements"],
  summary: "List acceptance criteria",
  description: "The acceptance criteria for a requirement, in display order.",
  middleware: [
    workspaceAccess.fromRequirement(),
    requireWorkspacePermission({ requirement: ["read"] }),
  ] as const,
  request: { params: requirementIdParam, query: workspaceIdQuery },
  responses: {
    200: jsonResponse("Acceptance criteria", acceptanceItemListSchema),
    400: errorResponse("The workspace could not be determined"),
    404: errorResponse("Unknown requirement"),
    403: errorResponse("No access to the requirement's workspace"),
  },
});

const createAcceptanceRoute = createRoute({
  method: "post",
  operationId: "createAcceptanceItem",
  path: "/{id}/acceptance-items",
  tags: ["Requirements"],
  summary: "Add acceptance criterion",
  description:
    "Add a criterion to a requirement. It starts as pending and is appended after the existing ones.",
  middleware: [
    workspaceAccess.fromRequirement(),
    requireWorkspacePermission({ requirement: ["update"] }),
  ] as const,
  request: {
    params: requirementIdParam,
    query: workspaceIdQuery,
    body: {
      required: true,
      content: { "application/json": { schema: createAcceptanceItemBody } },
    },
  },
  responses: {
    200: jsonResponse("The created criterion", acceptanceItemSchema),
    400: errorResponse("Invalid body"),
    404: errorResponse("Unknown requirement"),
    403: errorResponse(
      "No workspace access, or missing requirement:update permission",
    ),
  },
});

const updateAcceptanceRoute = createRoute({
  method: "patch",
  operationId: "updateAcceptanceItem",
  path: "/acceptance-items/{itemId}",
  tags: ["Requirements"],
  summary: "Update acceptance criterion",
  description:
    "Update a criterion, or verify it. Marking it passed or failed records the current user and timestamp; resetting it to pending clears both.",
  middleware: [
    workspaceAccess.fromAcceptanceItem(),
    requireWorkspacePermission({ requirement: ["update"] }),
  ] as const,
  request: {
    params: acceptanceItemParam,
    query: workspaceIdQuery,
    body: {
      required: true,
      content: { "application/json": { schema: updateAcceptanceItemBody } },
    },
  },
  responses: {
    200: jsonResponse("The updated criterion", acceptanceItemSchema),
    400: errorResponse("Invalid body"),
    403: errorResponse(
      "No workspace access, or missing requirement:update permission",
    ),
    404: errorResponse("Acceptance item not found"),
  },
});

const deleteAcceptanceRoute = createRoute({
  method: "delete",
  operationId: "deleteAcceptanceItem",
  path: "/acceptance-items/{itemId}",
  tags: ["Requirements"],
  summary: "Delete acceptance criterion",
  description: "Remove an acceptance criterion from its requirement.",
  middleware: [
    workspaceAccess.fromAcceptanceItem(),
    requireWorkspacePermission({ requirement: ["update"] }),
  ] as const,
  request: { params: acceptanceItemParam, query: workspaceIdQuery },
  responses: {
    200: jsonResponse("The criterion was removed", deletedSchema),
    400: errorResponse("The workspace could not be determined"),
    403: errorResponse(
      "No workspace access, or missing requirement:update permission",
    ),
    404: errorResponse("Acceptance item not found"),
  },
});

const savedDocumentSchema = z.object({
  document: requirementDocumentDetailSchema,
  changed: z.boolean().openapi({
    description:
      "False when the submitted text matched the current version, in which case no version was stored.",
  }),
});

// Document routes live under `/documents/{documentId}` rather than nested in the
// requirement, so a save does not have to repeat the requirement id it is not
// acting on. The workspace is resolved from the document itself.
const listDocumentsRoute = createRoute({
  method: "get",
  operationId: "listRequirementDocuments",
  path: "/{id}/documents",
  tags: ["Requirements"],
  summary: "List requirement documents",
  description:
    "Documents attached to a requirement, in display order. Each entry carries its current version number and version count, not the Markdown.",
  middleware: [
    workspaceAccess.fromRequirement(),
    requireWorkspacePermission({ requirement: ["read"] }),
  ] as const,
  request: { params: requirementIdParam, query: workspaceIdQuery },
  responses: {
    200: jsonResponse(
      "Documents attached to the requirement",
      requirementDocumentListSchema,
    ),
    400: errorResponse("The workspace could not be determined"),
    403: errorResponse("No access to the requirement's workspace"),
    404: errorResponse("Unknown requirement"),
  },
});

const createDocumentRoute = createRoute({
  method: "post",
  operationId: "createRequirementDocument",
  path: "/{id}/documents",
  tags: ["Requirements"],
  summary: "Create requirement document",
  description:
    "Attach a document to a requirement. The supplied Markdown is stored as version 1, so every document has a history from the moment it exists.",
  middleware: [
    workspaceAccess.fromRequirement(),
    requireWorkspacePermission({ requirement: ["create"] }),
  ] as const,
  request: {
    params: requirementIdParam,
    query: workspaceIdQuery,
    body: {
      required: true,
      content: {
        "application/json": { schema: createRequirementDocumentBody },
      },
    },
  },
  responses: {
    200: jsonResponse("The created document", requirementDocumentDetailSchema),
    400: errorResponse("Invalid body, or unknown requirement"),
    403: errorResponse(
      "No workspace access, or missing requirement:create permission",
    ),
    404: errorResponse("Unknown requirement"),
  },
});

const getDocumentRoute = createRoute({
  method: "get",
  operationId: "getRequirementDocument",
  path: "/documents/{documentId}",
  tags: ["Requirements"],
  summary: "Get requirement document",
  description:
    "A document with the Markdown of its current version and the versions behind it, newest first.",
  middleware: [
    workspaceAccess.fromRequirementDocument(),
    requireWorkspacePermission({ requirement: ["read"] }),
  ] as const,
  request: { params: requirementDocumentParam, query: workspaceIdQuery },
  responses: {
    200: jsonResponse(
      "The document and its versions",
      requirementDocumentDetailSchema,
    ),
    400: errorResponse("The workspace could not be determined"),
    403: errorResponse("No access to the document's workspace"),
    404: errorResponse("Unknown document"),
  },
});

const updateDocumentRoute = createRoute({
  method: "patch",
  operationId: "updateRequirementDocument",
  path: "/documents/{documentId}",
  tags: ["Requirements"],
  summary: "Update requirement document",
  description:
    "Rename a document or move it within the requirement's document list. The Markdown is saved through the content route instead.",
  middleware: [
    workspaceAccess.fromRequirementDocument(),
    requireWorkspacePermission({ requirement: ["update"] }),
  ] as const,
  request: {
    params: requirementDocumentParam,
    query: workspaceIdQuery,
    body: {
      required: true,
      content: {
        "application/json": { schema: updateRequirementDocumentBody },
      },
    },
  },
  responses: {
    200: jsonResponse("The updated document", requirementDocumentDetailSchema),
    400: errorResponse("Invalid body, or unknown document"),
    403: errorResponse(
      "No workspace access, or missing requirement:update permission",
    ),
    404: errorResponse("Unknown document"),
  },
});

const saveDocumentRoute = createRoute({
  method: "put",
  operationId: "saveRequirementDocumentContent",
  path: "/documents/{documentId}/content",
  tags: ["Requirements"],
  summary: "Save requirement document content",
  description:
    "Store the document body as a new version and return the document. Restoring an old version is the same call: it becomes a new version rather than rewriting history.",
  middleware: [
    workspaceAccess.fromRequirementDocument(),
    requireWorkspacePermission({ requirement: ["update"] }),
  ] as const,
  request: {
    params: requirementDocumentParam,
    query: workspaceIdQuery,
    body: {
      required: true,
      content: {
        "application/json": { schema: saveRequirementDocumentBody },
      },
    },
  },
  responses: {
    200: jsonResponse(
      "The saved document, and whether a version was stored",
      savedDocumentSchema,
    ),
    400: errorResponse("Invalid body, or unknown document"),
    403: errorResponse(
      "No workspace access, or missing requirement:update permission",
    ),
    404: errorResponse("Unknown document"),
  },
});

const getDocumentVersionRoute = createRoute({
  method: "get",
  operationId: "getRequirementDocumentVersion",
  path: "/documents/{documentId}/versions/{version}",
  tags: ["Requirements"],
  summary: "Get one document version",
  description:
    "The Markdown of a single past version, for reading back or comparing against the current one.",
  middleware: [
    workspaceAccess.fromRequirementDocument(),
    requireWorkspacePermission({ requirement: ["read"] }),
  ] as const,
  request: {
    params: requirementDocumentVersionParam,
    query: workspaceIdQuery,
  },
  responses: {
    200: jsonResponse(
      "The requested version",
      requirementDocumentVersionSchema,
    ),
    400: errorResponse("Invalid version, or unknown document"),
    403: errorResponse("No access to the document's workspace"),
    404: errorResponse("Unknown document or version"),
  },
});

const deleteDocumentRoute = createRoute({
  method: "delete",
  operationId: "deleteRequirementDocument",
  path: "/documents/{documentId}",
  tags: ["Requirements"],
  summary: "Delete requirement document",
  description:
    "Remove a document and its whole version history from its requirement.",
  middleware: [
    workspaceAccess.fromRequirementDocument(),
    requireWorkspacePermission({ requirement: ["update"] }),
  ] as const,
  request: { params: requirementDocumentParam, query: workspaceIdQuery },
  responses: {
    200: jsonResponse("The document was removed", deletedSchema),
    400: errorResponse("The workspace could not be determined"),
    403: errorResponse(
      "No workspace access, or missing requirement:update permission",
    ),
    404: errorResponse("Unknown document"),
  },
});

const requirement = apiRouter<BaseVariables & { workspaceId: string }>()
  // Static paths are registered before `/{id}` so a stray id can never shadow
  // the tree, option, or acceptance-item routes.
  .openapi(listRoute, async (c) => {
    const filters = c.req.valid("query");
    return c.json(await listRequirements(filters), 200);
  })
  .openapi(treeRoute, async (c) => {
    const filters = c.req.valid("query");
    return c.json(await getRequirementTree(filters), 200);
  })
  .openapi(optionsRoute, async (c) => {
    const { workspaceId, excludeId } = c.req.valid("query");
    return c.json(await getRequirementOptions(workspaceId, excludeId), 200);
  })
  .openapi(updateAcceptanceRoute, async (c) => {
    const { itemId } = c.req.valid("param");
    const body = c.req.valid("json");
    const userId = c.get("userId");
    return c.json(await updateAcceptanceItem(itemId, body, userId), 200);
  })
  .openapi(deleteAcceptanceRoute, async (c) => {
    const { itemId } = c.req.valid("param");
    return c.json(await deleteAcceptanceItem(itemId), 200);
  })
  .openapi(tasksRoute, async (c) => {
    const { id } = c.req.valid("param");
    return c.json(await getRequirementTasks(id), 200);
  })
  .openapi(listAcceptanceRoute, async (c) => {
    const { id } = c.req.valid("param");
    return c.json(await listAcceptanceItems(id), 200);
  })
  .openapi(createAcceptanceRoute, async (c) => {
    const { id } = c.req.valid("param");
    const body = c.req.valid("json");
    return c.json(await createAcceptanceItem(id, body), 200);
  })
  .openapi(listDocumentsRoute, async (c) => {
    const { id } = c.req.valid("param");
    return c.json(await listRequirementDocuments(id), 200);
  })
  .openapi(createDocumentRoute, async (c) => {
    const { id } = c.req.valid("param");
    const body = c.req.valid("json");
    const userId = c.get("userId");
    return c.json(await createRequirementDocument(id, body, userId), 200);
  })
  .openapi(getDocumentVersionRoute, async (c) => {
    const { documentId, version } = c.req.valid("param");
    return c.json(
      await getRequirementDocumentVersion(documentId, version),
      200,
    );
  })
  .openapi(getDocumentRoute, async (c) => {
    const { documentId } = c.req.valid("param");
    return c.json(await getRequirementDocument(documentId), 200);
  })
  .openapi(updateDocumentRoute, async (c) => {
    const { documentId } = c.req.valid("param");
    const body = c.req.valid("json");
    return c.json(await updateRequirementDocument(documentId, body), 200);
  })
  .openapi(saveDocumentRoute, async (c) => {
    const { documentId } = c.req.valid("param");
    const { content } = c.req.valid("json");
    const userId = c.get("userId");
    return c.json(
      await saveRequirementDocumentContent(documentId, content, userId),
      200,
    );
  })
  .openapi(deleteDocumentRoute, async (c) => {
    const { documentId } = c.req.valid("param");
    return c.json(await deleteRequirementDocument(documentId), 200);
  })
  .openapi(createRouteDefinition, async (c) => {
    const body = c.req.valid("json");
    const userId = c.get("userId");
    return c.json(await createRequirement(body, userId), 200);
  })
  .openapi(childrenRoute, async (c) => {
    const { id } = c.req.valid("param");
    const body = c.req.valid("json");
    const userId = c.get("userId");
    return c.json(await createChildRequirements(id, body, userId), 200);
  })
  .openapi(statusRoute, async (c) => {
    const { id } = c.req.valid("param");
    const { status } = c.req.valid("json");
    return c.json(await updateRequirementStatus(id, status), 200);
  })
  .openapi(moveRoute, async (c) => {
    const { id } = c.req.valid("param");
    const { targetId } = c.req.valid("json");
    return c.json(await moveRequirement(id, targetId ?? null), 200);
  })
  .openapi(getRoute, async (c) => {
    const { id } = c.req.valid("param");
    return c.json(await getRequirement(id), 200);
  })
  .openapi(updateRoute, async (c) => {
    const { id } = c.req.valid("param");
    const body = c.req.valid("json");
    return c.json(await updateRequirement(id, body), 200);
  })
  .openapi(deleteRoute, async (c) => {
    const { id } = c.req.valid("param");
    return c.json(await deleteRequirement(id), 200);
  });

export default requirement;
