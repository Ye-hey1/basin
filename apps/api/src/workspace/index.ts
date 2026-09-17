import {
  apiRouter,
  type BaseVariables,
  createRoute,
  errorResponse,
  jsonResponse,
} from "../openapi";
import { workspaceAccess } from "../utils/workspace-access-middleware";
import getMyTasksCtrl from "./controllers/get-my-tasks";
import getWorkspaceMembersCtrl from "./controllers/get-workspace-members";
import getWorkspaceOverviewCtrl from "./controllers/get-workspace-overview";
import {
  myTaskListSchema,
  workspaceMemberListSchema,
  workspaceOverviewSchema,
} from "./response";
import { workspaceIdParam } from "./schema";

const getWorkspaceMembersRoute = createRoute({
  method: "get",
  operationId: "getWorkspaceMembers",
  path: "/{workspaceId}/members",
  tags: ["Workspaces"],
  summary: "Get workspace members",
  description: "Get all members of a workspace, with their role.",
  middleware: [workspaceAccess.fromParam("workspaceId")] as const,
  request: { params: workspaceIdParam },
  responses: {
    200: jsonResponse("List of workspace members", workspaceMemberListSchema),
    400: errorResponse("Workspace ID could not be determined"),
    403: errorResponse("No access to the workspace"),
  },
});

const getWorkspaceOverviewRoute = createRoute({
  method: "get",
  operationId: "getWorkspaceOverview",
  path: "/{workspaceId}/overview",
  tags: ["Workspaces"],
  summary: "Get workspace overview",
  description:
    "Aggregated task statistics for a workspace: totals across projects, per-project progress, and the busiest assignees.",
  middleware: [workspaceAccess.fromParam("workspaceId")] as const,
  request: { params: workspaceIdParam },
  responses: {
    200: jsonResponse("Workspace overview", workspaceOverviewSchema),
    400: errorResponse("Workspace ID could not be determined"),
    403: errorResponse("No access to the workspace"),
  },
});

const getMyTasksRoute = createRoute({
  method: "get",
  operationId: "getMyTasks",
  path: "/{workspaceId}/my-tasks",
  tags: ["Workspaces"],
  summary: "Get my tasks",
  description:
    "Open tasks assigned to the current user across the workspace's active projects, ordered by due date.",
  middleware: [workspaceAccess.fromParam("workspaceId")] as const,
  request: { params: workspaceIdParam },
  responses: {
    200: jsonResponse("Tasks assigned to the current user", myTaskListSchema),
    400: errorResponse("Workspace ID could not be determined"),
    403: errorResponse("No access to the workspace"),
  },
});

const workspace = apiRouter<BaseVariables & { workspaceId: string }>()
  .openapi(getWorkspaceMembersRoute, async (c) =>
    c.json(await getWorkspaceMembersCtrl(c.get("workspaceId")), 200),
  )
  .openapi(getWorkspaceOverviewRoute, async (c) =>
    c.json(await getWorkspaceOverviewCtrl(c.get("workspaceId")), 200),
  )
  .openapi(getMyTasksRoute, async (c) =>
    c.json(await getMyTasksCtrl(c.get("workspaceId"), c.get("userId")), 200),
  );

export default workspace;
