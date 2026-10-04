import type { BrainSourceType } from "@basin/ai";
import { Queue } from "bullmq";
import { getRedisPub, isRedisConfigured } from "../redis";
import { runIndexJob } from "./pipeline";

export const AI_INDEX_QUEUE_NAME = "basin-ai-index";

export type IndexJobPayload = {
  sourceType: BrainSourceType;
  sourceId: string;
};

// Redis is optional in basin (AGENTS.md: single-instance deployments stay
// first-class). With Redis the queue is drained by the apps/agent worker;
// without it, indexing runs inline in the API process. Both paths execute the
// same pipeline, so behavior is identical — only the process differs.
let queue: Queue<IndexJobPayload> | null | undefined;

function getIndexQueue(): Queue<IndexJobPayload> | null {
  if (queue !== undefined) {
    return queue;
  }
  if (!isRedisConfigured()) {
    queue = null;
    return queue;
  }
  try {
    queue = new Queue<IndexJobPayload>(AI_INDEX_QUEUE_NAME, {
      connection: getRedisPub(),
    });
  } catch (error) {
    console.warn(
      "[ai] failed to initialize index queue, falling back to inline processing:",
      error,
    );
    queue = null;
  }
  return queue;
}

export async function enqueueIndexJob(payload: IndexJobPayload): Promise<void> {
  const indexQueue = getIndexQueue();
  if (!indexQueue) {
    void runIndexJob(payload).catch(() => {});
    return;
  }

  try {
    // jobId deduplicates bursts of events for the same source (a task edit
    // fires several events); the last write still wins because indexing is
    // idempotent and reads current content. Underscore separator: cuid2 ids
    // never contain one, and BullMQ forbids ":" in custom ids.
    await indexQueue.add("index", payload, {
      jobId: `${payload.sourceType}_${payload.sourceId}`,
      attempts: 3,
      backoff: { type: "exponential", delay: 3000 },
      removeOnComplete: { age: 3600, count: 1000 },
      removeOnFail: { age: 86400 },
    });
  } catch (error) {
    console.warn("[ai] enqueue failed, running index job inline:", error);
    void runIndexJob(payload).catch(() => {});
  }
}

export async function closeAiQueues(): Promise<void> {
  if (queue) {
    await queue.close();
    queue = undefined;
  }
}
