import { createRequire } from "node:module";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { AuthService } from "./auth/auth-service.js";
import { BasinClient } from "./basin/client.js";
import { registerTools } from "./tools/register.js";
import { normalizeBaseUrl } from "./utils/normalize-base-url.js";

const require = createRequire(import.meta.url);
const { version: packageVersion } = require("../package.json") as {
  version: string;
};

export function createMcpServer(): McpServer {
  const baseUrl = normalizeBaseUrl(
    process.env.BASIN_API_URL || "http://localhost:1337",
  );
  const clientId = process.env.BASIN_MCP_CLIENT_ID || "basin-mcp";
  const apiKey = process.env.BASIN_API_KEY || undefined;
  const auth = new AuthService({ baseUrl, clientId, apiKey });
  const client = new BasinClient({ baseUrl, auth });
  const server = new McpServer({
    name: "basin-mcp",
    version: packageVersion,
  });
  registerTools(server, { client });
  return server;
}
