// Shared response shapes for the agents UI. The API zod schemas define the
// authoritative shape; these mirrors exist so components can type props
// without importing the hono client in three places.
export type AgentTrigger = {
  id: string;
  workspaceId: string;
  name: string;
  type: string;
  eventType: string | null;
  condition: Record<string, unknown> | null;
  cron: string | null;
  projectId: string | null;
  instruction: string;
  enabled: boolean;
  lastFiredAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type McpServer = {
  id: string;
  workspaceId: string;
  name: string;
  transport: string;
  url: string | null;
  command: string | null;
  args: string[] | null;
  hasEnv: boolean;
  hasHeaders: boolean;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
};
