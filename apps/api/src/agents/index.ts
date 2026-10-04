import {
  apiRouter,
  createRoute,
  errorResponse,
  jsonResponse,
  z,
} from "../openapi";
import { requireWorkspacePermission } from "../utils/require-workspace-permission";
import { workspaceAccess } from "../utils/workspace-access-middleware";
import {
  createMcpServer,
  createTrigger,
  deleteMcpServer,
  deleteTrigger,
  getRun,
  listMcpServers,
  listRuns,
  listTriggers,
  manualRun,
  updateMcpServer,
  updateTrigger,
} from "./controllers";
import {
  agentRunDetailSchema,
  agentRunListSchema,
  agentTriggerListSchema,
  agentTriggerSchema,
  mcpServerListSchema,
  mcpServerSchema,
} from "./response";
import {
  agentIdParam,
  createMcpServerBody,
  createTriggerBody,
  listRunsQuery,
  runTriggerBody,
  updateMcpServerBody,
  updateTriggerBody,
  workspaceIdQuery,
} from "./schema";

const MANAGE: Record<string, string[]> = { workspace: ["manage_settings"] };

const listTriggersRoute = createRoute({
  method: "get",
  operationId: "listAgentTriggers",
  path: "/triggers",
  tags: ["Agents"],
  summary: "List agent triggers",
  description: "Automation triggers configured in the workspace.",
  middleware: [workspaceAccess.fromQuery()] as const,
  request: { query: workspaceIdQuery },
  responses: {
    200: jsonResponse("The workspace's agent triggers", agentTriggerListSchema),
    400: errorResponse("The workspace could not be determined"),
    403: errorResponse("No access to the workspace"),
  },
});

const createTriggerRoute = createRoute({
  method: "post",
  operationId: "createAgentTrigger",
  path: "/triggers",
  tags: ["Agents"],
  summary: "Create agent trigger",
  description:
    "Create an automation trigger. Requires workspace manage_settings permission; the agent acts with the creator's workspace permissions.",
  middleware: [
    workspaceAccess.fromBody(),
    requireWorkspacePermission(MANAGE),
  ] as const,
  request: {
    body: {
      required: true,
      content: { "application/json": { schema: createTriggerBody } },
    },
  },
  responses: {
    200: jsonResponse("The created trigger", agentTriggerSchema),
    400: errorResponse("Invalid body"),
    403: errorResponse("No workspace access, or missing manage_settings"),
  },
});

const updateTriggerRoute = createRoute({
  method: "put",
  operationId: "updateAgentTrigger",
  path: "/triggers/{id}",
  tags: ["Agents"],
  summary: "Update agent trigger",
  description: "Update an automation trigger, including its enabled state.",
  middleware: [
    workspaceAccess.fromBody(),
    requireWorkspacePermission(MANAGE),
  ] as const,
  request: {
    params: agentIdParam,
    body: {
      required: true,
      content: { "application/json": { schema: updateTriggerBody } },
    },
  },
  responses: {
    200: jsonResponse("The updated trigger", agentTriggerSchema),
    400: errorResponse("Invalid body"),
    404: errorResponse("Trigger not found"),
  },
});

const deleteTriggerRoute = createRoute({
  method: "delete",
  operationId: "deleteAgentTrigger",
  path: "/triggers/{id}",
  tags: ["Agents"],
  summary: "Delete agent trigger",
  description: "Delete an automation trigger. Its run history is kept.",
  middleware: [
    workspaceAccess.fromQuery(),
    requireWorkspacePermission(MANAGE),
  ] as const,
  request: { params: agentIdParam, query: workspaceIdQuery },
  responses: {
    200: jsonResponse(
      "The trigger was deleted",
      z.object({ success: z.boolean() }),
    ),
    404: errorResponse("Trigger not found"),
  },
});

const runTriggerRoute = createRoute({
  method: "post",
  operationId: "runAgentTrigger",
  path: "/triggers/{id}/run",
  tags: ["Agents"],
  summary: "Run agent trigger now",
  description:
    "Kick off a manual run of a trigger without waiting for its event or schedule. Returns the run id immediately; poll the run for progress.",
  middleware: [
    workspaceAccess.fromBody(),
    requireWorkspacePermission(MANAGE),
  ] as const,
  request: {
    params: agentIdParam,
    body: {
      required: true,
      content: { "application/json": { schema: runTriggerBody } },
    },
  },
  responses: {
    200: jsonResponse("The queued run id", z.object({ runId: z.string() })),
    404: errorResponse("Trigger not found"),
    403: errorResponse("No workspace access, or missing manage_settings"),
  },
});

const listRunsRoute = createRoute({
  method: "get",
  operationId: "listAgentRuns",
  path: "/runs",
  tags: ["Agents"],
  summary: "List agent runs",
  description: "Recent agent runs in the workspace, newest first.",
  middleware: [workspaceAccess.fromQuery()] as const,
  request: { query: listRunsQuery },
  responses: {
    200: jsonResponse("The workspace's agent runs", agentRunListSchema),
    400: errorResponse("The workspace could not be determined"),
    403: errorResponse("No access to the workspace"),
  },
});

const getRunRoute = createRoute({
  method: "get",
  operationId: "getAgentRun",
  path: "/runs/{id}",
  tags: ["Agents"],
  summary: "Get agent run detail",
  description: "One agent run with its tool-call steps, newest step first.",
  middleware: [workspaceAccess.fromQuery()] as const,
  request: { params: agentIdParam, query: workspaceIdQuery },
  responses: {
    200: jsonResponse("The run with its steps", agentRunDetailSchema),
    404: errorResponse("Run not found"),
  },
});

const listMcpServersRoute = createRoute({
  method: "get",
  operationId: "listMcpServers",
  path: "/mcp-servers",
  tags: ["Agents"],
  summary: "List MCP servers",
  description:
    "MCP tool servers available to the workspace's agents. Credentials are never returned, only presence flags.",
  middleware: [workspaceAccess.fromQuery()] as const,
  request: { query: workspaceIdQuery },
  responses: {
    200: jsonResponse("The workspace's MCP servers", mcpServerListSchema),
    400: errorResponse("The workspace could not be determined"),
    403: errorResponse("No access to the workspace"),
  },
});

const createMcpServerRoute = createRoute({
  method: "post",
  operationId: "createMcpServer",
  path: "/mcp-servers",
  tags: ["Agents"],
  summary: "Register MCP server",
  description:
    "Register an MCP tool server (streamable HTTP or local stdio process) for the workspace's agents.",
  middleware: [
    workspaceAccess.fromBody(),
    requireWorkspacePermission(MANAGE),
  ] as const,
  request: {
    body: {
      required: true,
      content: { "application/json": { schema: createMcpServerBody } },
    },
  },
  responses: {
    200: jsonResponse("The registered MCP server", mcpServerSchema),
    400: errorResponse("Invalid body"),
    403: errorResponse("No workspace access, or missing manage_settings"),
  },
});

const updateMcpServerRoute = createRoute({
  method: "put",
  operationId: "updateMcpServer",
  path: "/mcp-servers/{id}",
  tags: ["Agents"],
  summary: "Update MCP server",
  description:
    "Update an MCP server. Omit env/headers to keep stored credentials; send an empty object to clear them.",
  middleware: [
    workspaceAccess.fromBody(),
    requireWorkspacePermission(MANAGE),
  ] as const,
  request: {
    params: agentIdParam,
    body: {
      required: true,
      content: { "application/json": { schema: updateMcpServerBody } },
    },
  },
  responses: {
    200: jsonResponse("The updated MCP server", mcpServerSchema),
    404: errorResponse("MCP server not found"),
  },
});

const deleteMcpServerRoute = createRoute({
  method: "delete",
  operationId: "deleteMcpServer",
  path: "/mcp-servers/{id}",
  tags: ["Agents"],
  summary: "Delete MCP server",
  middleware: [
    workspaceAccess.fromQuery(),
    requireWorkspacePermission(MANAGE),
  ] as const,
  request: { params: agentIdParam, query: workspaceIdQuery },
  responses: {
    200: jsonResponse(
      "The server was deleted",
      z.object({ success: z.boolean() }),
    ),
    404: errorResponse("MCP server not found"),
  },
});

const agents = apiRouter()
  .openapi(listTriggersRoute, async (c) => {
    const { workspaceId } = c.req.valid("query");
    return c.json(await listTriggers(workspaceId), 200);
  })
  .openapi(createTriggerRoute, async (c) => {
    const { workspaceId, ...body } = c.req.valid("json");
    return c.json(await createTrigger(c.get("userId"), workspaceId, body), 200);
  })
  .openapi(updateTriggerRoute, async (c) => {
    const { id } = c.req.valid("param");
    const { workspaceId, ...body } = c.req.valid("json");
    return c.json(await updateTrigger(id, workspaceId, body), 200);
  })
  .openapi(deleteTriggerRoute, async (c) => {
    const { id } = c.req.valid("param");
    const { workspaceId } = c.req.valid("query");
    return c.json(await deleteTrigger(id, workspaceId), 200);
  })
  .openapi(runTriggerRoute, async (c) => {
    const { id } = c.req.valid("param");
    const { workspaceId } = c.req.valid("json");
    return c.json(await manualRun(id, workspaceId, c.get("userId")), 200);
  })
  .openapi(listRunsRoute, async (c) => {
    const { workspaceId, limit } = c.req.valid("query");
    return c.json(await listRuns(workspaceId, limit ?? 50), 200);
  })
  .openapi(getRunRoute, async (c) => {
    const { id } = c.req.valid("param");
    const { workspaceId } = c.req.valid("query");
    return c.json(await getRun(id, workspaceId), 200);
  })
  .openapi(listMcpServersRoute, async (c) => {
    const { workspaceId } = c.req.valid("query");
    return c.json(await listMcpServers(workspaceId), 200);
  })
  .openapi(createMcpServerRoute, async (c) => {
    const { workspaceId, ...body } = c.req.valid("json");
    return c.json(
      await createMcpServer(c.get("userId"), workspaceId, body),
      200,
    );
  })
  .openapi(updateMcpServerRoute, async (c) => {
    const { id } = c.req.valid("param");
    const { workspaceId, ...body } = c.req.valid("json");
    return c.json(await updateMcpServer(id, workspaceId, body), 200);
  })
  .openapi(deleteMcpServerRoute, async (c) => {
    const { id } = c.req.valid("param");
    const { workspaceId } = c.req.valid("query");
    return c.json(await deleteMcpServer(id, workspaceId), 200);
  });

export default agents;
