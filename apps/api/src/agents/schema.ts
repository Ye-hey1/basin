import { z } from "../openapi";

export const AGENT_EVENT_TYPES = [
  "task.status_changed",
  "task.due_date_changed",
  "requirement.updated",
] as const;

export const workspaceIdQuery = z.object({
  workspaceId: z.string().min(1),
});

export const agentIdParam = z.object({ id: z.string().min(1) });

export const createTriggerBody = z
  .object({
    workspaceId: z.string().min(1),
    name: z.string().trim().min(1).max(120),
    type: z.enum(["event", "cron"]),
    eventType: z.enum(AGENT_EVENT_TYPES).optional(),
    condition: z.record(z.string(), z.unknown()).optional(),
    cron: z.string().trim().max(120).optional(),
    projectId: z.string().optional(),
    instruction: z.string().trim().min(1).max(8000),
  })
  .superRefine((value, ctx) => {
    if (value.type === "event" && !value.eventType) {
      ctx.addIssue({
        code: "custom",
        path: ["eventType"],
        message: "Event triggers require an eventType",
      });
    }
    if (value.type === "cron" && !value.cron) {
      ctx.addIssue({
        code: "custom",
        path: ["cron"],
        message: "Cron triggers require a cron expression",
      });
    }
  });

export const updateTriggerBody = z.object({
  workspaceId: z.string().min(1),
  name: z.string().trim().min(1).max(120).optional(),
  eventType: z.enum(AGENT_EVENT_TYPES).optional(),
  condition: z.record(z.string(), z.unknown()).nullable().optional(),
  cron: z.string().trim().max(120).nullable().optional(),
  projectId: z.string().nullable().optional(),
  instruction: z.string().trim().min(1).max(8000).optional(),
  enabled: z.boolean().optional(),
});

export const runTriggerBody = z.object({
  workspaceId: z.string().min(1),
});

export const listRunsQuery = z.object({
  workspaceId: z.string().min(1),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

export const createMcpServerBody = z
  .object({
    workspaceId: z.string().min(1),
    name: z.string().trim().min(1).max(120),
    transport: z.enum(["http", "stdio"]),
    url: z.string().trim().url().max(2048).optional(),
    command: z.string().trim().max(2048).optional(),
    args: z.array(z.string().max(2048)).max(32).optional(),
    env: z.record(z.string(), z.string()).optional(),
    headers: z.record(z.string(), z.string()).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.transport === "http" && !value.url) {
      ctx.addIssue({
        code: "custom",
        path: ["url"],
        message: "http transport requires a url",
      });
    }
    if (value.transport === "stdio" && !value.command) {
      ctx.addIssue({
        code: "custom",
        path: ["command"],
        message: "stdio transport requires a command",
      });
    }
  });

export const updateMcpServerBody = z.object({
  workspaceId: z.string().min(1),
  name: z.string().trim().min(1).max(120).optional(),
  url: z.string().trim().url().max(2048).nullable().optional(),
  command: z.string().trim().max(2048).nullable().optional(),
  args: z.array(z.string().max(2048)).max(32).nullable().optional(),
  // Absent keeps stored credentials; empty object clears them.
  env: z.record(z.string(), z.string()).nullable().optional(),
  headers: z.record(z.string(), z.string()).nullable().optional(),
  enabled: z.boolean().optional(),
});
