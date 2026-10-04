import { client } from "@basin/libs";
import type { InferResponseType } from "hono/client";
import { HttpError } from "@/lib/http-error";

export type AgentTrigger = InferResponseType<
  (typeof client)["agents"]["triggers"]["$get"],
  200
>[number];

export type AgentTriggerDetail = InferResponseType<
  (typeof client)["agents"]["triggers"][":id"]["$put"],
  200
>;

export async function getAgentTriggers(workspaceId: string) {
  const response = await client.agents.triggers.$get({
    query: { workspaceId },
  });
  if (!response.ok) {
    throw await HttpError.fromResponse(response, "Request failed");
  }
  return await response.json();
}

export async function createAgentTrigger(input: {
  workspaceId: string;
  name: string;
  type: "event" | "cron";
  eventType?:
    | "task.status_changed"
    | "task.due_date_changed"
    | "requirement.updated";
  condition?: Record<string, unknown>;
  cron?: string;
  projectId?: string;
  instruction: string;
}) {
  const response = await client.agents.triggers.$post({ json: input });
  if (!response.ok) {
    throw await HttpError.fromResponse(response, "Request failed");
  }
  return await response.json();
}

export async function updateAgentTrigger(input: {
  id: string;
  workspaceId: string;
  name?: string;
  eventType?:
    | "task.status_changed"
    | "task.due_date_changed"
    | "requirement.updated";
  condition?: Record<string, unknown> | null;
  cron?: string | null;
  projectId?: string | null;
  instruction?: string;
  enabled?: boolean;
}) {
  const response = await client.agents.triggers[":id"].$put({
    param: { id: input.id },
    json: {
      workspaceId: input.workspaceId,
      name: input.name,
      eventType: input.eventType,
      condition: input.condition,
      cron: input.cron,
      projectId: input.projectId,
      instruction: input.instruction,
      enabled: input.enabled,
    },
  });
  if (!response.ok) {
    throw await HttpError.fromResponse(response, "Request failed");
  }
  return await response.json();
}

export async function deleteAgentTrigger(id: string, workspaceId: string) {
  const response = await client.agents.triggers[":id"].$delete({
    param: { id },
    query: { workspaceId },
  });
  if (!response.ok) {
    throw await HttpError.fromResponse(response, "Request failed");
  }
  return await response.json();
}

export async function runAgentTrigger(id: string, workspaceId: string) {
  const response = await client.agents.triggers[":id"]["run"].$post({
    param: { id },
    json: { workspaceId },
  });
  if (!response.ok) {
    throw await HttpError.fromResponse(response, "Request failed");
  }
  return await response.json();
}
