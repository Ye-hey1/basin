import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { jsonSchema, type Tool, tool } from "ai";
import { eq } from "drizzle-orm";
import db, { schema } from "../database";

const CONNECT_TIMEOUT_MS = 10_000;
const CALL_TIMEOUT_MS = 60_000;
const MAX_TOOLS_PER_SERVER = 50;

type McpServerRow = typeof schema.mcpServerTable.$inferSelect;

async function connectClient(
  server: McpServerRow,
): Promise<{ client: Client; close: () => Promise<void> }> {
  const client = new Client({ name: "basin-agent", version: "1.0.0" });

  if (server.transport === "http") {
    if (!server.url) {
      throw new Error("http transport requires a url");
    }
    const transport = new StreamableHTTPClientTransport(new URL(server.url), {
      requestInit: { headers: server.headers ?? undefined },
    });
    await client.connect(transport);
    return { client, close: () => client.close() };
  }

  if (!server.command) {
    throw new Error("stdio transport requires a command");
  }
  const transport = new StdioClientTransport({
    command: server.command,
    args: server.args ?? [],
    env: server.env as Record<string, string> | undefined,
  });
  await client.connect(transport);
  return { client, close: () => client.close() };
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string) {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(
        () => reject(new Error(`${label} timed out after ${ms}ms`)),
        ms,
      ),
    ),
  ]);
}

export type McpToolset = {
  tools: Record<string, Tool>;
  close: () => Promise<void>;
};

// Wraps external MCP tools as AI SDK tools for the agent loop. A server that
// fails to connect is skipped (with a log) rather than failing the whole run
// — automation must not break because one integration is down.
export async function loadMcpTools(workspaceId: string): Promise<McpToolset> {
  const servers = await db
    .select()
    .from(schema.mcpServerTable)
    .where(eq(schema.mcpServerTable.workspaceId, workspaceId));

  const tools: Record<string, Tool> = {};
  const clients: { close: () => Promise<void> }[] = [];

  for (const server of servers) {
    if (!server.enabled) continue;

    let client: Client;
    let close: () => Promise<void>;
    try {
      const connection = await withTimeout(
        connectClient(server),
        CONNECT_TIMEOUT_MS,
        `MCP server "${server.name}" connect`,
      );
      client = connection.client;
      close = connection.close;
    } catch (error) {
      console.error(
        `[agents] failed to connect MCP server "${server.name}":`,
        error,
      );
      continue;
    }

    try {
      const { tools: mcpTools } = await withTimeout(
        client.listTools(),
        CONNECT_TIMEOUT_MS,
        `MCP server "${server.name}" listTools`,
      );

      for (const mcpTool of mcpTools.slice(0, MAX_TOOLS_PER_SERVER)) {
        // Namespaced name avoids collisions between servers and with the
        // internal toolset.
        const name = `mcp_${server.name}_${mcpTool.name}`.replace(
          /[^a-zA-Z0-9_]/g,
          "_",
        );
        tools[name] = tool({
          description:
            mcpTool.description || `MCP tool ${mcpTool.name} (${server.name})`,
          inputSchema: jsonSchema(
            mcpTool.inputSchema as Parameters<typeof jsonSchema>[0],
          ),
          execute: async (args) => {
            const result = await withTimeout(
              client.callTool({ name: mcpTool.name, arguments: args }),
              CALL_TIMEOUT_MS,
              `MCP tool ${name}`,
            );
            return result;
          },
        });
      }

      clients.push({ close });
    } catch (error) {
      console.error(
        `[agents] failed to load tools from MCP server "${server.name}":`,
        error,
      );
      await close().catch(() => {});
    }
  }

  return {
    tools,
    close: async () => {
      await Promise.allSettled(clients.map((client) => client.close()));
    },
  };
}
