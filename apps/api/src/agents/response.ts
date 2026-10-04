import { nullableResponseTimestamp, responseTimestamp, z } from "../openapi";

export const agentTriggerSchema = z
  .object({
    id: z.string(),
    workspaceId: z.string(),
    name: z.string(),
    type: z.string(),
    eventType: z.string().nullable(),
    condition: z.record(z.string(), z.unknown()).nullable(),
    cron: z.string().nullable(),
    projectId: z.string().nullable(),
    instruction: z.string(),
    enabled: z.boolean(),
    lastFiredAt: nullableResponseTimestamp,
    createdAt: responseTimestamp,
    updatedAt: responseTimestamp,
  })
  .openapi("AgentTrigger");

export const agentTriggerListSchema = z.array(agentTriggerSchema);

export const agentRunStepSchema = z
  .object({
    id: z.string(),
    stepIndex: z.number(),
    toolName: z.string(),
    args: z.record(z.string(), z.unknown()).nullable(),
    resultSummary: z.string().nullable(),
    createdAt: responseTimestamp,
  })
  .openapi("AgentRunStep");

export const agentRunSchema = z
  .object({
    id: z.string(),
    workspaceId: z.string(),
    triggerId: z.string().nullable(),
    projectId: z.string().nullable(),
    triggerType: z.string(),
    status: z.string(),
    input: z.record(z.string(), z.unknown()).nullable(),
    prompt: z.string(),
    output: z.string().nullable(),
    error: z.string().nullable(),
    promptTokens: z.number().nullable(),
    completionTokens: z.number().nullable(),
    durationMs: z.number().nullable(),
    startedAt: nullableResponseTimestamp,
    finishedAt: nullableResponseTimestamp,
    createdAt: responseTimestamp,
  })
  .openapi("AgentRun");

export const agentRunListSchema = z.array(agentRunSchema);

export const agentRunDetailSchema = z
  .object({ run: agentRunSchema, steps: z.array(agentRunStepSchema) })
  .openapi("AgentRunDetail");

export const mcpServerSchema = z
  .object({
    id: z.string(),
    workspaceId: z.string(),
    name: z.string(),
    transport: z.string(),
    url: z.string().nullable(),
    command: z.string().nullable(),
    args: z.array(z.string()).nullable(),
    hasEnv: z.boolean(),
    hasHeaders: z.boolean(),
    enabled: z.boolean(),
    createdAt: responseTimestamp,
    updatedAt: responseTimestamp,
  })
  .openapi("McpServer");

export const mcpServerListSchema = z.array(mcpServerSchema);
