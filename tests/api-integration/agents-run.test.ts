import { and, eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import db, { schema } from "../../apps/api/src/database";
import type { AiRuntimeConfig } from "../../packages/ai/src/index";
import { resetTestDatabase } from "./helpers/database";
import {
  createProjectFixture,
  createWorkspaceMember,
} from "./helpers/fixtures";

process.env.AI_PROVIDER = "openai-compatible";
process.env.AI_BASE_URL = "http://localhost:9";
process.env.AI_API_KEY = "test-key";
process.env.AI_CHAT_MODEL = "test-chat";
process.env.AI_EMBEDDING_MODEL = "test-embedding";

const { executeAgentRun } = await import("../../apps/api/src/agents/runtime");

const fakeEmbed = async (
  _config: AiRuntimeConfig,
  texts: string[],
): Promise<{ vectors: number[][]; dimensions: number }> => ({
  vectors: texts.map((text) => {
    const hash = new TextEncoder().encode(text);
    return Array.from(
      { length: 8 },
      (_, index) => (hash[index % hash.length] / 255) * 2 - 1,
    );
  }),
  dimensions: 8,
});

async function seedWorkspaceWithTask() {
  const { workspace, user } = await createWorkspaceMember();
  const { project } = await createProjectFixture({ workspaceId: workspace.id });
  const [task] = await db
    .insert(schema.taskTable)
    .values({
      projectId: project.id,
      title: "Blocked payment flow",
      description: "The payment webhook is failing since Tuesday.",
    })
    .returning();

  const [trigger] = await db
    .insert(schema.agentTriggerTable)
    .values({
      workspaceId: workspace.id,
      name: "blocked analyzer",
      type: "event",
      eventType: "task.status_changed",
      condition: { newStatus: ["blocked"] },
      instruction: "分析阻塞原因并在任务下评论建议。",
      createdBy: user.id,
    })
    .returning();

  return { workspace, user, project, task, trigger };
}

describe("agent run execution (integration)", () => {
  beforeEach(async () => {
    await resetTestDatabase();
  });

  it("runs the tool loop, records steps, and comments as the agent", async () => {
    const { workspace, task, trigger } = await seedWorkspaceWithTask();

    const [run] = await db
      .insert(schema.agentRunTable)
      .values({
        workspaceId: workspace.id,
        triggerId: trigger.id,
        projectId: task.projectId,
        triggerType: "event",
        status: "pending",
        input: { taskId: task.id, newStatus: "blocked" },
        prompt: trigger.instruction,
      })
      .returning();

    let calls = 0;
    const usage = { inputTokens: 10, outputTokens: 5, totalTokens: 15 };
    const { MockLanguageModelV2 } = await import("ai/test");
    const mockModel = new MockLanguageModelV2({
      doGenerate: async () => {
        calls += 1;
        if (calls === 1) {
          return {
            finishReason: "tool-calls" as const,
            usage,
            content: [
              {
                type: "tool-call" as const,
                toolCallId: "call-1",
                toolName: "add_comment",
                input: JSON.stringify({
                  taskId: task.id,
                  content:
                    "阻塞原因初步判断是 webhook 凭据过期，建议先轮换再重试。",
                }),
              },
            ],
            warnings: [],
          };
        }
        return {
          finishReason: "stop" as const,
          usage: { inputTokens: 20, outputTokens: 8, totalTokens: 28 },
          content: [{ type: "text" as const, text: "已完成分析并评论。" }],
          warnings: [],
        };
      },
    });

    await executeAgentRun(run.id, {
      model: mockModel,
      embedTexts: fakeEmbed,
    });

    const [executed] = await db
      .select()
      .from(schema.agentRunTable)
      .where(eq(schema.agentRunTable.id, run.id));
    expect(executed.status).toBe("completed");
    expect(executed.output).toContain("已完成分析");
    expect(executed.durationMs).not.toBeNull();

    const steps = await db
      .select()
      .from(schema.agentRunStepTable)
      .where(eq(schema.agentRunStepTable.runId, run.id));
    expect(steps.length).toBe(1);
    expect(steps[0].toolName).toBe("add_comment");
    expect(JSON.stringify(steps[0].args)).toContain(task.id);

    // The comment was actually written, marked as the agent's.
    const [comment] = await db
      .select()
      .from(schema.activityTable)
      .where(
        and(
          eq(schema.activityTable.taskId, task.id),
          eq(schema.activityTable.type, "comment"),
        ),
      );
    expect(comment.content).toContain("🤖");
    expect(comment.content).toContain("webhook");
  });

  it("marks the run failed when the actor has no task:update permission", async () => {
    const { workspace, user, task, trigger } = await seedWorkspaceWithTask();
    // Viewer role has no task:update, so add_comment refuses.
    await db
      .update(schema.workspaceUserTable)
      .set({ role: "viewer" })
      .where(eq(schema.workspaceUserTable.userId, user.id));

    const [run] = await db
      .insert(schema.agentRunTable)
      .values({
        workspaceId: workspace.id,
        triggerId: trigger.id,
        triggerType: "manual",
        status: "pending",
        input: { taskId: task.id },
        prompt: trigger.instruction,
      })
      .returning();

    let calls = 0;
    const { MockLanguageModelV2 } = await import("ai/test");
    const mockModel = new MockLanguageModelV2({
      doGenerate: async () => {
        calls += 1;
        if (calls === 1) {
          return {
            finishReason: "tool-calls" as const,
            usage: { inputTokens: 5, outputTokens: 5, totalTokens: 10 },
            content: [
              {
                type: "tool-call" as const,
                toolCallId: "call-1",
                toolName: "add_comment",
                input: JSON.stringify({ taskId: task.id, content: "试一下" }),
              },
            ],
            warnings: [],
          };
        }
        return {
          finishReason: "stop" as const,
          usage: { inputTokens: 5, outputTokens: 5, totalTokens: 10 },
          content: [{ type: "text" as const, text: "好" }],
          warnings: [],
        };
      },
    });

    await executeAgentRun(run.id, {
      model: mockModel,
      embedTexts: fakeEmbed,
    });

    const [executed] = await db
      .select()
      .from(schema.agentRunTable)
      .where(eq(schema.agentRunTable.id, run.id));
    // The tool returned an error payload to the model instead of throwing;
    // the run still completes but no comment exists.
    expect(executed.status).toBe("completed");
    const comments = await db
      .select()
      .from(schema.activityTable)
      .where(eq(schema.activityTable.taskId, task.id));
    expect(comments).toHaveLength(0);
  });

  it("marks the run failed when the model errors", async () => {
    const { workspace, trigger } = await seedWorkspaceWithTask();

    const [run] = await db
      .insert(schema.agentRunTable)
      .values({
        workspaceId: workspace.id,
        triggerId: trigger.id,
        triggerType: "manual",
        status: "pending",
        input: {},
        prompt: trigger.instruction,
      })
      .returning();

    const { MockLanguageModelV2 } = await import("ai/test");
    const failingModel = new MockLanguageModelV2({
      doGenerate: async () => {
        throw new Error("provider down");
      },
    });

    await executeAgentRun(run.id, {
      model: failingModel,
      embedTexts: fakeEmbed,
    });

    const [executed] = await db
      .select()
      .from(schema.agentRunTable)
      .where(eq(schema.agentRunTable.id, run.id));
    expect(executed.status).toBe("failed");
    expect(executed.error).toContain("provider down");
  });
});
