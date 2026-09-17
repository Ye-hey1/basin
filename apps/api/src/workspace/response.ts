import { z } from "../openapi";

export const workspaceMemberSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    email: z.string(),
    image: z.string().nullable(),
    role: z.string().openapi({
      description:
        "The member's workspace role: a built-in role (owner, admin, member, guest) or a custom role name.",
    }),
  })
  .openapi("WorkspaceMember");

export const workspaceMemberListSchema = z.array(workspaceMemberSchema);

export const workspaceOverviewSchema = z
  .object({
    totals: z.object({
      total: z.number(),
      completed: z.number(),
      overdue: z.number(),
      dueSoon: z.number(),
    }),
    projects: z.array(
      z.object({
        projectId: z.string(),
        name: z.string(),
        total: z.number(),
        completed: z.number(),
      }),
    ),
    assignees: z.array(
      z.object({
        assigneeId: z.string(),
        name: z.string(),
        open: z.number(),
      }),
    ),
  })
  .openapi("WorkspaceOverview");

export const myTaskSchema = z
  .object({
    id: z.string(),
    projectId: z.string(),
    projectName: z.string(),
    position: z.number().nullable(),
    number: z.number().nullable(),
    userId: z.string().nullable(),
    title: z.string(),
    description: z.string().nullable(),
    status: z.string(),
    priority: z.string(),
    startDate: z.string().nullable(),
    dueDate: z.string().nullable(),
    createdAt: z.string(),
  })
  .openapi("MyTask");

export const myTaskListSchema = z.array(myTaskSchema);
