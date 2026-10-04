import { client } from "@basin/libs";
import type { InferResponseType } from "hono/client";
import { HttpError } from "@/lib/http-error";

export type McpServer = InferResponseType<
  (typeof client)["agents"]["mcp-servers"]["$get"],
  200
>[number];

export async function getMcpServers(workspaceId: string) {
  const response = await client.agents["mcp-servers"].$get({
    query: { workspaceId },
  });
  if (!response.ok) {
    throw await HttpError.fromResponse(response, "Request failed");
  }
  return await response.json();
}

export async function createMcpServer(input: {
  workspaceId: string;
  name: string;
  transport: "http" | "stdio";
  url?: string;
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  headers?: Record<string, string>;
}) {
  const response = await client.agents["mcp-servers"].$post({ json: input });
  if (!response.ok) {
    throw await HttpError.fromResponse(response, "Request failed");
  }
  return await response.json();
}

export async function updateMcpServer(input: {
  id: string;
  workspaceId: string;
  name?: string;
  url?: string | null;
  command?: string | null;
  enabled?: boolean;
}) {
  const response = await client.agents["mcp-servers"][":id"].$put({
    param: { id: input.id },
    json: {
      workspaceId: input.workspaceId,
      name: input.name,
      url: input.url,
      command: input.command,
      enabled: input.enabled,
    },
  });
  if (!response.ok) {
    throw await HttpError.fromResponse(response, "Request failed");
  }
  return await response.json();
}

export async function deleteMcpServer(id: string, workspaceId: string) {
  const response = await client.agents["mcp-servers"][":id"].$delete({
    param: { id },
    query: { workspaceId },
  });
  if (!response.ok) {
    throw await HttpError.fromResponse(response, "Request failed");
  }
  return await response.json();
}
