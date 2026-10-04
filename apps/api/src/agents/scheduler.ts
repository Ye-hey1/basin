import { Cron } from "croner";
import { and, eq } from "drizzle-orm";
import db, { schema } from "../database";
import { withJobLease } from "../scheduler/leader-lock";
import { enqueueAgentRun } from "./queue";
import { startAgentRun } from "./runtime";

let ticker: Cron | null = null;

// Crone parses and validates; paused keeps it from scheduling anything.
export function isValidCronExpression(expression: string): boolean {
  try {
    const cron = new Cron(expression, { paused: true });
    cron.stop();
    return true;
  } catch {
    return false;
  }
}

async function fireDueCronTriggers(): Promise<void> {
  const now = new Date();
  const minuteStart = new Date(Math.floor(now.getTime() / 60_000) * 60_000);

  const triggers = await db
    .select()
    .from(schema.agentTriggerTable)
    .where(
      and(
        eq(schema.agentTriggerTable.type, "cron"),
        eq(schema.agentTriggerTable.enabled, true),
      ),
    );

  for (const trigger of triggers) {
    if (!trigger.cron) continue;

    try {
      const cron = new Cron(trigger.cron, { paused: true });
      const previousMinute = new Date(minuteStart.getTime() - 1);
      const next = cron.nextRun(previousMinute);
      cron.stop();

      if (
        !next ||
        Math.abs(next.getTime() - minuteStart.getTime()) > 1_000 ||
        // Guard against double-firing when multiple API instances tick in the
        // same minute (job_lease narrows this window; lastFiredAt closes it).
        (trigger.lastFiredAt && trigger.lastFiredAt >= minuteStart)
      ) {
        continue;
      }
    } catch (error) {
      console.error(`[agents] invalid cron on trigger ${trigger.id}:`, error);
      continue;
    }

    await db
      .update(schema.agentTriggerTable)
      .set({ lastFiredAt: new Date() })
      .where(eq(schema.agentTriggerTable.id, trigger.id));

    const runId = await startAgentRun({
      trigger,
      triggerType: "cron",
      input: { firedAt: minuteStart.toISOString() },
    });
    await enqueueAgentRun(runId);
  }
}

// One DB-driven tick per minute: trigger CRUD never has to touch timers, and
// multiple API instances coordinate through the job_lease table.
export function registerAgentCronScheduler(): void {
  ticker = new Cron("* * * * *", () =>
    withJobLease("agent-cron-tick", fireDueCronTriggers, () => {}),
  );
}

export function shutdownAgentCronScheduler(): void {
  ticker?.stop();
  ticker = null;
}
