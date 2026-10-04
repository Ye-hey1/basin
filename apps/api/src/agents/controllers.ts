import { and, desc, eq } from "drizzle-orm";
import db, { schema } from "../database";
import { httpError } from "../utils/http-error";
import { enqueueAgentRun } from "./queue";
import { startAgentRun } from "./runtime";
import { isValidCronExpression } from "./scheduler";

type TriggerRow = typeof schema.agentTriggerTable.$inferSelect;
type McpServerRow = typeof schema.mcpServerTable.$inferSelect;

type CreateTriggerInput = {
  name: string;
  type: string;
  eventType?: string;
  condition?: Record<string, unknown>;
  cron?: string;
  projectId?: string;
  instruction: string;
};

type UpdateTriggerInput = {
  name?: string;
  eventType?: string;
  condition?: Record<string, unknown> | null;
  cron?: string | null;
  projectId?: string | null;
  instruction?: string;
  enabled?: boolean;
};

async function loadWorkspaceTrigger(
  triggerId: string,
  workspaceId: string,
): Promise<TriggerRow> {
  const [trigger] = await db
    .select()
    .from(schema.agentTriggerTable)
    .where(eq(schema.agentTriggerTable.id, triggerId))
    .limit(1);

  if (!trigger || trigger.workspaceId !== workspaceId) {
    throw httpError(404, "trigger_not_found", "Agent trigger not found");
  }
  return trigger;
}

function validateTriggerShape(input: {
  type?: string;
  eventType?: string | null;
  cron?: string | null;
}) {
  const type = input.type;
  if (type === "event" && !input.eventType) {
    throw httpError(400, "invalid_trigger", "Event triggers need an eventType");
  }
  if (type === "cron") {
    if (!input.cron) {
      throw httpError(
        400,
        "invalid_trigger",
        "Cron triggers need a cron expression",
      );
    }
    if (!isValidCronExpression(input.cron)) {
      throw httpError(400, "invalid_cron", "Invalid cron expression");
    }
  }
  if (input.cron && !isValidCronExpression(input.cron)) {
    throw httpError(400, "invalid_cron", "Invalid cron expression");
  }
}

export async function listTriggers(workspaceId: string) {
  return db
    .select()
    .from(schema.agentTriggerTable)
    .where(eq(schema.agentTriggerTable.workspaceId, workspaceId))
    .orderBy(desc(schema.agentTriggerTable.createdAt))
    .limit(100);
}

export async function createTrigger(
  userId: string,
  workspaceId: string,
  input: CreateTriggerInput,
) {
  validateTriggerShape(input);

  let projectId: string | null = null;
  if (input.projectId) {
    const [project] = await db
      .select({ id: schema.projectTable.id })
      .from(schema.projectTable)
      .where(
        and(
          eq(schema.projectTable.id, input.projectId),
          eq(schema.projectTable.workspaceId, workspaceId),
        ),
      )
      .limit(1);
    if (!project) {
      throw httpError(404, "project_not_found", "Project not found");
    }
    projectId = project.id;
  }

  const [trigger] = await db
    .insert(schema.agentTriggerTable)
    .values({
      workspaceId,
      name: input.name,
      type: input.type,
      eventType: input.eventType ?? null,
      condition: input.condition ?? null,
      cron: input.cron ?? null,
      projectId,
      instruction: input.instruction,
      createdBy: userId,
    })
    .returning();

  if (!trigger) {
    throw httpError(
      500,
      "failed_to_create_trigger",
      "Failed to create trigger",
    );
  }
  return trigger;
}

export async function updateTrigger(
  triggerId: string,
  workspaceId: string,
  input: UpdateTriggerInput,
) {
  const trigger = await loadWorkspaceTrigger(triggerId, workspaceId);
  validateTriggerShape({
    type: input.eventType !== undefined ? trigger.type : undefined,
    eventType: input.eventType,
    cron: input.cron === undefined ? undefined : input.cron,
  });

  const patch: Partial<typeof schema.agentTriggerTable.$inferInsert> = {};
  if (input.name !== undefined) patch.name = input.name;
  if (input.eventType !== undefined) patch.eventType = input.eventType;
  if (input.condition !== undefined) patch.condition = input.condition;
  if (input.cron !== undefined) patch.cron = input.cron;
  if (input.instruction !== undefined) patch.instruction = input.instruction;
  if (input.enabled !== undefined) patch.enabled = input.enabled;
  if (input.projectId !== undefined) {
    if (input.projectId === null) {
      patch.projectId = null;
    } else {
      const [project] = await db
        .select({ id: schema.projectTable.id })
        .from(schema.projectTable)
        .where(
          and(
            eq(schema.projectTable.id, input.projectId),
            eq(schema.projectTable.workspaceId, workspaceId),
          ),
        )
        .limit(1);
      if (!project) {
        throw httpError(404, "project_not_found", "Project not found");
      }
      patch.projectId = project.id;
    }
  }

  const [updated] = await db
    .update(schema.agentTriggerTable)
    .set(patch)
    .where(eq(schema.agentTriggerTable.id, trigger.id))
    .returning();

  if (!updated) {
    throw httpError(
      500,
      "failed_to_update_trigger",
      "Failed to update trigger",
    );
  }
  return updated;
}

export async function deleteTrigger(triggerId: string, workspaceId: string) {
  const trigger = await loadWorkspaceTrigger(triggerId, workspaceId);
  await db
    .delete(schema.agentTriggerTable)
    .where(eq(schema.agentTriggerTable.id, trigger.id));
  return { success: true };
}

export async function manualRun(
  triggerId: string,
  workspaceId: string,
  userId: string,
) {
  const trigger = await loadWorkspaceTrigger(triggerId, workspaceId);
  const runId = await startAgentRun({
    trigger,
    triggerType: "manual",
    input: { requestedBy: userId },
  });
  await enqueueAgentRun(runId);
  return { runId };
}

export async function listRuns(workspaceId: string, limit: number) {
  return db
    .select()
    .from(schema.agentRunTable)
    .where(eq(schema.agentRunTable.workspaceId, workspaceId))
    .orderBy(desc(schema.agentRunTable.createdAt))
    .limit(limit);
}

export async function getRun(runId: string, workspaceId: string) {
  const [run] = await db
    .select()
    .from(schema.agentRunTable)
    .where(eq(schema.agentRunTable.id, runId))
    .limit(1);

  if (!run || run.workspaceId !== workspaceId) {
    throw httpError(404, "run_not_found", "Agent run not found");
  }

  const steps = await db
    .select()
    .from(schema.agentRunStepTable)
    .where(eq(schema.agentRunStepTable.runId, run.id))
    .orderBy(desc(schema.agentRunStepTable.stepIndex));

  return { run, steps };
}

// env/headers may contain credentials: only presence flags cross the API.
function toMcpServerView(server: McpServerRow) {
  return {
    id: server.id,
    workspaceId: server.workspaceId,
    name: server.name,
    transport: server.transport,
    url: server.url,
    command: server.command,
    args: server.args ?? null,
    hasEnv: Boolean(server.env && Object.keys(server.env).length > 0),
    hasHeaders: Boolean(
      server.headers && Object.keys(server.headers).length > 0,
    ),
    enabled: server.enabled,
    createdAt: server.createdAt,
    updatedAt: server.updatedAt,
  };
}

export async function listMcpServers(workspaceId: string) {
  const rows = await db
    .select()
    .from(schema.mcpServerTable)
    .where(eq(schema.mcpServerTable.workspaceId, workspaceId))
    .orderBy(desc(schema.mcpServerTable.createdAt));
  return rows.map(toMcpServerView);
}

type CreateMcpServerInput = {
  name: string;
  transport: string;
  url?: string;
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  headers?: Record<string, string>;
};

export async function createMcpServer(
  userId: string,
  workspaceId: string,
  input: CreateMcpServerInput,
) {
  const [server] = await db
    .insert(schema.mcpServerTable)
    .values({
      workspaceId,
      name: input.name,
      transport: input.transport,
      url: input.url ?? null,
      command: input.command ?? null,
      args: input.args ?? null,
      env: input.env ?? null,
      headers: input.headers ?? null,
      createdBy: userId,
    })
    .returning();

  if (!server) {
    throw httpError(
      500,
      "failed_to_create_mcp_server",
      "Failed to create MCP server",
    );
  }
  return toMcpServerView(server);
}

type UpdateMcpServerInput = {
  name?: string;
  url?: string | null;
  command?: string | null;
  args?: string[] | null;
  env?: Record<string, string> | null;
  headers?: Record<string, string> | null;
  enabled?: boolean;
};

export async function updateMcpServer(
  serverId: string,
  workspaceId: string,
  input: UpdateMcpServerInput,
) {
  const [server] = await db
    .select()
    .from(schema.mcpServerTable)
    .where(eq(schema.mcpServerTable.id, serverId))
    .limit(1);

  if (!server || server.workspaceId !== workspaceId) {
    throw httpError(404, "mcp_server_not_found", "MCP server not found");
  }

  const patch: Partial<typeof schema.mcpServerTable.$inferInsert> = {};
  if (input.name !== undefined) patch.name = input.name;
  if (input.url !== undefined) patch.url = input.url;
  if (input.command !== undefined) patch.command = input.command;
  if (input.args !== undefined) patch.args = input.args;
  if (input.env !== undefined) patch.env = input.env;
  if (input.headers !== undefined) patch.headers = input.headers;
  if (input.enabled !== undefined) patch.enabled = input.enabled;

  const [updated] = await db
    .update(schema.mcpServerTable)
    .set(patch)
    .where(eq(schema.mcpServerTable.id, server.id))
    .returning();

  if (!updated) {
    throw httpError(
      500,
      "failed_to_update_mcp_server",
      "Failed to update MCP server",
    );
  }
  return toMcpServerView(updated);
}

export async function deleteMcpServer(serverId: string, workspaceId: string) {
  const [server] = await db
    .select()
    .from(schema.mcpServerTable)
    .where(eq(schema.mcpServerTable.id, serverId))
    .limit(1);

  if (!server || server.workspaceId !== workspaceId) {
    throw httpError(404, "mcp_server_not_found", "MCP server not found");
  }

  await db
    .delete(schema.mcpServerTable)
    .where(eq(schema.mcpServerTable.id, server.id));
  return { success: true };
}
