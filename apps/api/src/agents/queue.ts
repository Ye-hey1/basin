import { Queue } from "bullmq";
import { getRedisPub, isRedisConfigured } from "../redis";
import { executeAgentRun } from "./runtime";

export const AGENT_RUN_QUEUE_NAME = "basin-agent-run";

// Same dual-mode as the AI index queue (apps/api/src/ai/queue.ts): with Redis
// the run executes in the apps/agent worker, otherwise inline in the API.
let queue: Queue<{ runId: string }> | null | undefined;

function getAgentQueue(): Queue<{ runId: string }> | null {
  if (queue !== undefined) {
    return queue;
  }
  if (!isRedisConfigured()) {
    queue = null;
    return queue;
  }
  try {
    queue = new Queue<{ runId: string }>(AGENT_RUN_QUEUE_NAME, {
      connection: getRedisPub(),
    });
  } catch (error) {
    console.warn(
      "[agents] failed to initialize run queue, falling back to inline:",
      error,
    );
    queue = null;
  }
  return queue;
}

export async function enqueueAgentRun(runId: string): Promise<void> {
  const agentQueue = getAgentQueue();
  if (!agentQueue) {
    void executeAgentRun(runId).catch(() => {});
    return;
  }

  try {
    await agentQueue.add(
      "run",
      { runId },
      {
        jobId: runId,
        attempts: 1,
        removeOnComplete: { age: 3600, count: 500 },
        removeOnFail: { age: 86400 },
      },
    );
  } catch (error) {
    console.warn("[agents] enqueue failed, running inline:", error);
    void executeAgentRun(runId).catch(() => {});
  }
}

export async function closeAgentQueues(): Promise<void> {
  if (queue) {
    await queue.close();
    queue = undefined;
  }
}
