import {
  buildRagContextBlock,
  type embedTexts,
  resolveChatModel,
} from "@basin/ai";
import { generateText, type LanguageModel, stepCountIs } from "ai";
import { eq } from "drizzle-orm";
import { getAiRuntimeConfig } from "../ai/config";
import { retrieveBrainContext } from "../ai/pipeline";
import db, { schema } from "../database";
import { eventContext } from "../events";
import { validateWorkspaceAccess } from "../utils/validate-workspace-access";
import { loadMcpTools } from "./mcp";
import { buildAgentTools } from "./tools";

export type AgentTriggerRow = typeof schema.agentTriggerTable.$inferSelect;

const AGENT_MAX_STEPS = 6;
const AGENT_TIMEOUT_MS = 120_000;

const AGENT_SYSTEM_PROMPT = [
  "You are the workspace's automation agent. You complete one task per run, as instructed by the trigger, and write the result back into the workspace.",
  "Stay within the instruction: verify facts with tools before concluding. Say so plainly when information is insufficient instead of inventing details.",
  "To write back, use add_comment on the most relevant task; never comment the same task twice in one run.",
  "Answer in the language the instruction is written in. Be concise and action-oriented.",
].join("\n");

// Creates the audit row up front so a crashed execution still shows up as
// pending in the run history; the queue payload only carries the run id.
export async function startAgentRun(options: {
  trigger: AgentTriggerRow;
  triggerType: "event" | "cron" | "manual";
  input: Record<string, unknown>;
}): Promise<string> {
  const [run] = await db
    .insert(schema.agentRunTable)
    .values({
      workspaceId: options.trigger.workspaceId,
      triggerId: options.trigger.id,
      projectId: options.trigger.projectId,
      triggerType: options.triggerType,
      status: "pending",
      input: options.input,
      prompt: options.trigger.instruction,
    })
    .returning({ id: schema.agentRunTable.id });

  if (!run) {
    throw new Error("Failed to create agent run");
  }
  return run.id;
}

async function recordSteps(
  runId: string,
  startIndex: number,
  step: {
    toolCalls?: { toolName?: string; input?: unknown }[];
    toolResults?: { toolName?: string; output?: unknown }[];
  },
) {
  const calls = step.toolCalls ?? [];
  if (calls.length === 0) {
    return;
  }
  const results = new Map(
    (step.toolResults ?? []).map((result, index) => [
      result.toolName ?? String(index),
      result.output,
    ]),
  );

  await db.insert(schema.agentRunStepTable).values(
    calls.map((call, index) => {
      const raw = results.get(call.toolName ?? String(index));
      const summary = raw === undefined ? "" : JSON.stringify(raw);
      return {
        runId,
        stepIndex: startIndex + index,
        toolName: call.toolName ?? "unknown",
        args:
          call.input && typeof call.input === "object"
            ? (call.input as Record<string, unknown>)
            : { value: call.input ?? null },
        resultSummary: summary.slice(0, 2000),
      };
    }),
  );
}

// Executes one run to completion. Runs in the agent worker when Redis is
// configured, or inline in the API process otherwise; both call this.
export async function executeAgentRun(
  runId: string,
  // Injectable for tests; production resolves the real model and embedder.
  deps: { model?: LanguageModel; embedTexts?: typeof embedTexts } = {},
): Promise<void> {
  const startedAt = new Date();
  await db
    .update(schema.agentRunTable)
    .set({ status: "running", startedAt })
    .where(eqRunId(runId));

  try {
    const [run] = await db
      .select()
      .from(schema.agentRunTable)
      .where(eqRunId(runId))
      .limit(1);
    if (!run) {
      throw new Error(`agent run ${runId} not found`);
    }

    const [trigger] = run.triggerId
      ? await db
          .select()
          .from(schema.agentTriggerTable)
          .where(eqTriggerId(run.triggerId))
          .limit(1)
      : [];

    const workspaceId = run.workspaceId;
    const actorId = trigger?.createdBy;
    if (!actorId) {
      throw new Error("agent run has no acting user");
    }
    await validateWorkspaceAccess(actorId, workspaceId);

    const config = await getAiRuntimeConfig();
    if (!config) {
      throw new Error(
        "AI provider is not configured. An instance admin can set it up in settings.",
      );
    }

    const inputJson = JSON.stringify(run.input ?? {}).slice(0, 4000);
    const contextQuery = `${run.prompt}\n${inputJson}`.slice(0, 800);
    const sources = await retrieveBrainContext(
      { workspaceId, query: contextQuery },
      deps.embedTexts ? { embedTexts: deps.embedTexts } : {},
    );
    const contextBlock = buildRagContextBlock(sources);

    const system = [AGENT_SYSTEM_PROMPT, contextBlock]
      .filter(Boolean)
      .join("\n\n");

    const userMessage = [
      `指令：${run.prompt}`,
      `触发上下文（JSON）：${inputJson}`,
    ].join("\n\n");

    const tools = {
      ...buildAgentTools({
        workspaceId,
        projectId: run.projectId,
        actorId,
      }),
      ...(await loadMcpTools(workspaceId)).tools,
    };

    let stepIndex = 0;
    const result = await eventContext.run(
      { initiatorId: `agent:${runId}` },
      () =>
        generateText({
          model: deps.model ?? resolveChatModel(config),
          system,
          prompt: userMessage,
          tools,
          stopWhen: stepCountIs(AGENT_MAX_STEPS),
          temperature: 0.2,
          abortSignal: AbortSignal.timeout(AGENT_TIMEOUT_MS),
          onStepFinish: async (step) => {
            await recordSteps(runId, stepIndex, step);
            stepIndex += step.toolCalls?.length ?? 0;
          },
        }),
    );

    await db
      .update(schema.agentRunTable)
      .set({
        status: "completed",
        output: result.text,
        promptTokens: result.totalUsage.inputTokens ?? undefined,
        completionTokens: result.totalUsage.outputTokens ?? undefined,
        durationMs: Date.now() - startedAt.getTime(),
        finishedAt: new Date(),
      })
      .where(eqRunId(runId));
  } catch (error) {
    await db
      .update(schema.agentRunTable)
      .set({
        status: "failed",
        error: error instanceof Error ? error.message : String(error),
        durationMs: Date.now() - startedAt.getTime(),
        finishedAt: new Date(),
      })
      .where(eqRunId(runId));
    console.error(`[agents] run ${runId} failed:`, error);
  }
}

function eqRunId(id: string) {
  return eq(schema.agentRunTable.id, id);
}

function eqTriggerId(id: string) {
  return eq(schema.agentTriggerTable.id, id);
}
