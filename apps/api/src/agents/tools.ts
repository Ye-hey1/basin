import { type Tool, tool } from "ai";
import { and, desc, eq, ilike, or } from "drizzle-orm";
import { z } from "zod";
import db, { schema } from "../database";
import { userHasWorkspacePermission } from "./permissions";

export type ToolContext = {
  workspaceId: string;
  projectId: string | null;
  // The trigger creator: the agent acts with this user's permissions.
  actorId: string;
};

const MAX_LIST = 25;

// Agent tools are deliberately read-mostly: writes are limited to comments,
// which fire the normal event pipeline (indexing, notifications) but cannot
// re-enter task-status triggers, so the automation cannot loop on itself.
export function buildAgentTools(context: ToolContext): Record<string, Tool> {
  const taskSummary = {
    id: schema.taskTable.id,
    title: schema.taskTable.title,
    status: schema.taskTable.status,
    priority: schema.taskTable.priority,
    dueDate: schema.taskTable.dueDate,
    updatedAt: schema.taskTable.updatedAt,
  };

  return {
    search_tasks: tool({
      description:
        "Search tasks in the workspace by keyword in title or description.",
      inputSchema: z.object({
        query: z.string().min(1),
        projectId: z.string().optional(),
        limit: z.number().int().min(1).max(MAX_LIST).optional(),
      }),
      execute: async ({ query, projectId, limit }) => {
        const rows = await db
          .select(taskSummary)
          .from(schema.taskTable)
          .where(
            and(
              eq(schema.projectTable.workspaceId, context.workspaceId),
              projectId ? eq(schema.taskTable.projectId, projectId) : undefined,
              or(
                ilike(schema.taskTable.title, `%${query}%`),
                ilike(schema.taskTable.description, `%${query}%`),
              ),
            ),
          )
          .orderBy(desc(schema.taskTable.updatedAt))
          .limit(limit ?? 10);
        return rows;
      },
    }),

    list_tasks: tool({
      description:
        "List tasks in a project (or the whole workspace) optionally filtered by status.",
      inputSchema: z.object({
        projectId: z.string().optional(),
        status: z.string().optional(),
        limit: z.number().int().min(1).max(MAX_LIST).optional(),
      }),
      execute: async ({ projectId, status, limit }) => {
        const rows = await db
          .select(taskSummary)
          .from(schema.taskTable)
          .innerJoin(
            schema.projectTable,
            eq(schema.taskTable.projectId, schema.projectTable.id),
          )
          .where(
            and(
              eq(schema.projectTable.workspaceId, context.workspaceId),
              projectId ? eq(schema.taskTable.projectId, projectId) : undefined,
              status ? eq(schema.taskTable.status, status) : undefined,
            ),
          )
          .orderBy(desc(schema.taskTable.updatedAt))
          .limit(limit ?? 15);
        return rows;
      },
    }),

    get_task: tool({
      description:
        "Get one task's details including its recent comments, by task id.",
      inputSchema: z.object({ taskId: z.string().min(1) }),
      execute: async ({ taskId }) => {
        const [task] = await db
          .select({
            id: schema.taskTable.id,
            title: schema.taskTable.title,
            description: schema.taskTable.description,
            status: schema.taskTable.status,
            priority: schema.taskTable.priority,
            dueDate: schema.taskTable.dueDate,
            createdAt: schema.taskTable.createdAt,
            updatedAt: schema.taskTable.updatedAt,
            projectName: schema.projectTable.name,
          })
          .from(schema.taskTable)
          .innerJoin(
            schema.projectTable,
            eq(schema.taskTable.projectId, schema.projectTable.id),
          )
          .where(
            and(
              eq(schema.taskTable.id, taskId),
              eq(schema.projectTable.workspaceId, context.workspaceId),
            ),
          )
          .limit(1);

        if (!task) {
          return { error: "task not found in this workspace" };
        }

        const comments = await db
          .select({
            content: schema.activityTable.content,
            createdAt: schema.activityTable.createdAt,
          })
          .from(schema.activityTable)
          .where(
            and(
              eq(schema.activityTable.taskId, taskId),
              eq(schema.activityTable.type, "comment"),
            ),
          )
          .orderBy(desc(schema.activityTable.createdAt))
          .limit(10);

        return { ...task, comments };
      },
    }),

    list_projects: tool({
      description: "List the projects in the workspace.",
      inputSchema: z.object({}),
      execute: async () => {
        return db
          .select({
            id: schema.projectTable.id,
            name: schema.projectTable.name,
          })
          .from(schema.projectTable)
          .where(eq(schema.projectTable.workspaceId, context.workspaceId))
          .orderBy(desc(schema.projectTable.createdAt))
          .limit(MAX_LIST);
      },
    }),

    add_comment: tool({
      description:
        "Post a comment on a task as the automation agent. Use it for analysis results, summaries, or suggestions.",
      inputSchema: z.object({
        taskId: z.string().min(1),
        content: z.string().min(1).max(8000),
      }),
      execute: async ({ taskId, content }) => {
        const allowed = await userHasWorkspacePermission(
          context.actorId,
          context.workspaceId,
          { task: ["update"] },
        );
        if (!allowed) {
          return { error: "actor lacks task:update permission" };
        }

        const [task] = await db
          .select({ id: schema.taskTable.id })
          .from(schema.taskTable)
          .innerJoin(
            schema.projectTable,
            eq(schema.taskTable.projectId, schema.projectTable.id),
          )
          .where(
            and(
              eq(schema.taskTable.id, taskId),
              eq(schema.projectTable.workspaceId, context.workspaceId),
            ),
          )
          .limit(1);

        if (!task) {
          return { error: "task not found in this workspace" };
        }

        const createComment = (
          await import("../activity/controllers/create-comment")
        ).default;
        // 🤖 prefix keeps agent output distinguishable from human comments.
        const activity = await createComment(
          taskId,
          context.actorId,
          `🤖 ${content}`,
        );
        return { activityId: activity.id, taskId };
      },
    }),
  };
}
