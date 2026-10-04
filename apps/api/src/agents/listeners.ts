import { eq } from "drizzle-orm";
import db, { schema } from "../database";
import { subscribeToEvent } from "../events";
import { enqueueAgentRun } from "./queue";
import { startAgentRun } from "./runtime";

type EventPayload = Record<string, unknown> & { initiatorId?: string };

const AGENT_TRIGGER_EVENTS = [
  "task.status_changed",
  "task.due_date_changed",
  "requirement.updated",
];

// Condition keys must exist in the payload; values match by equality, or by
// membership when the condition value is an array.
export function matchesCondition(
  condition: Record<string, unknown> | null | undefined,
  payload: Record<string, unknown>,
): boolean {
  if (!condition) {
    return true;
  }
  return Object.entries(condition).every(([key, expected]) => {
    const actual = payload[key];
    if (Array.isArray(expected)) {
      return expected.includes(actual);
    }
    return actual === expected;
  });
}

async function workspaceIdForEvent(
  eventType: string,
  payload: Record<string, unknown>,
): Promise<string | null> {
  const projectId = payload.projectId;
  if (typeof projectId === "string") {
    const [project] = await db
      .select({ workspaceId: schema.projectTable.workspaceId })
      .from(schema.projectTable)
      .where(eq(schema.projectTable.id, projectId))
      .limit(1);
    if (project) {
      return project.workspaceId;
    }
  }

  const requirementId = payload.requirementId;
  if (typeof requirementId === "string") {
    const [requirement] = await db
      .select({ workspaceId: schema.requirementTable.workspaceId })
      .from(schema.requirementTable)
      .where(eq(schema.requirementTable.id, requirementId))
      .limit(1);
    if (requirement) {
      return requirement.workspaceId;
    }
  }

  console.error(`[agents] cannot resolve workspace for ${eventType} event`);
  return null;
}

// Bridges domain events to enabled event triggers. Agent-initiated writes
// carry an initiatorId of "agent:<runId>" (set in the run's eventContext) and
// are skipped, so automation can never trigger itself in a loop.
export function registerAgentTriggerListeners(): void {
  for (const eventType of AGENT_TRIGGER_EVENTS) {
    subscribeToEvent<EventPayload>(eventType, async (payload) => {
      if (payload.initiatorId?.startsWith("agent:")) {
        return;
      }

      const workspaceId = await workspaceIdForEvent(eventType, payload);
      if (!workspaceId) {
        return;
      }

      const triggers = await db
        .select()
        .from(schema.agentTriggerTable)
        .where(eq(schema.agentTriggerTable.workspaceId, workspaceId));

      for (const trigger of triggers) {
        if (!trigger.enabled || trigger.type !== "event") {
          continue;
        }
        if (trigger.eventType !== eventType) {
          continue;
        }
        if (!matchesCondition(trigger.condition, payload)) {
          continue;
        }

        const runId = await startAgentRun({
          trigger,
          triggerType: "event",
          input: payload as Record<string, unknown>,
        });
        await enqueueAgentRun(runId);
      }
    });
  }
}
