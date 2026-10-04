import { config } from "dotenv-mono";

config();

import { createServer } from "node:http";
import { executeAgentRun } from "@basin/api/agents-runner";
import { type IndexJobPayload, runIndexJob } from "@basin/api/ai-pipeline";
import { Worker } from "bullmq";
import Redis from "ioredis";

// The worker drains the BullMQ queues when Redis is configured on an
// instance. Without Redis the API falls back to inline processing, and the
// worker simply has nothing to do — it still boots and serves /health so
// deployment tooling can probe it uniformly.
const redisUrl = process.env.REDIS_URL?.trim();
if (!redisUrl) {
  console.warn(
    "[agent] REDIS_URL is not set; no queues to drain. API instances will process AI jobs inline.",
  );
}

function createWorker<T>(
  name: string,
  processor: (job: { data: T; id?: string }) => Promise<void>,
): Worker<T> | null {
  if (!redisUrl) {
    return null;
  }
  // BullMQ blocks the connection for job polling; the default
  // maxRetriesPerRequest would turn a Redis blip into failed jobs.
  return new Worker<T>(name, processor, {
    connection: new Redis(redisUrl, { maxRetriesPerRequest: null }),
    concurrency: Number(process.env.AGENT_CONCURRENCY || 2),
  });
}

const indexWorker = createWorker<IndexJobPayload>(
  "basin-ai-index",
  async (job) => {
    console.log(`[agent] processing index job ${job.id}`);
    await runIndexJob(job.data);
  },
);

const agentRunWorker = createWorker<{ runId: string }>(
  "basin-agent-run",
  async (job) => {
    console.log(`[agent] processing agent run ${job.id}`);
    await executeAgentRun(job.data.runId);
  },
);

for (const worker of [indexWorker, agentRunWorker]) {
  if (!worker) continue;
  worker.on("completed", (job) => {
    console.log(`[agent] job ${job.id} completed`);
  });
  worker.on("failed", (job, error) => {
    console.error(`[agent] job ${job?.id ?? "?"} failed:`, error.message);
  });
}

const healthPort = Number(process.env.AGENT_HEALTH_PORT || 1338);
const healthServer = createServer((req, res) => {
  if (req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok" }));
    return;
  }
  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ message: "Not Found", code: "not_found" }));
});

healthServer.listen(healthPort, () => {
  console.log(
    `🤖 Agent worker ready (health: http://localhost:${healthPort}/health, queues: ${indexWorker && agentRunWorker ? "connected" : "idle"})`,
  );
});

let shuttingDown = false;
async function shutdown() {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log("[agent] shutting down gracefully...");
  try {
    if (indexWorker) {
      await indexWorker.close();
    }
    if (agentRunWorker) {
      await agentRunWorker.close();
    }
    healthServer.close();
    process.exit(0);
  } catch (error) {
    console.error("[agent] shutdown error:", error);
    process.exit(1);
  }
}

process.on("SIGTERM", () => void shutdown());
process.on("SIGINT", () => void shutdown());
