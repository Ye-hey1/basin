import { client } from "@basin/libs";
import type { InferResponseType } from "hono/client";
import { HttpError } from "@/lib/http-error";

export type AgentRun = InferResponseType<
  (typeof client)["agents"]["runs"]["$get"],
  200
>[number];

export type AgentRunDetail = InferResponseType<
  (typeof client)["agents"]["runs"][":id"]["$get"],
  200
>;

export async function getAgentRuns(workspaceId: string, limit?: number) {
  const response = await client.agents.runs.$get({
    query: { workspaceId, limit },
  });
  if (!response.ok) {
    throw await HttpError.fromResponse(response, "Request failed");
  }
  return await response.json();
}

export async function getAgentRun(id: string, workspaceId: string) {
  const response = await client.agents.runs[":id"].$get({
    param: { id },
    query: { workspaceId },
  });
  if (!response.ok) {
    throw await HttpError.fromResponse(response, "Request failed");
  }
  return await response.json();
}
