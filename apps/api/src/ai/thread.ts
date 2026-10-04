import { and, asc, desc, eq } from "drizzle-orm";
import db, { schema } from "../database";
import { httpError } from "../utils/http-error";
import { validateWorkspaceAccess } from "../utils/validate-workspace-access";

// Threads are private to their owner; workspace membership is checked on top
// so a thread dies with its workspace access.
export async function loadOwnedThread(threadId: string, userId: string) {
  const [thread] = await db
    .select()
    .from(schema.aiThreadTable)
    .where(eq(schema.aiThreadTable.id, threadId))
    .limit(1);

  if (!thread || thread.userId !== userId) {
    throw httpError(404, "thread_not_found", "AI thread not found");
  }

  await validateWorkspaceAccess(userId, thread.workspaceId);
  return thread;
}

export async function listThreadMessages(threadId: string) {
  const rows = await db
    .select({
      id: schema.aiMessageTable.id,
      role: schema.aiMessageTable.role,
      content: schema.aiMessageTable.content,
      citations: schema.aiMessageTable.citations,
      createdAt: schema.aiMessageTable.createdAt,
    })
    .from(schema.aiMessageTable)
    .where(eq(schema.aiMessageTable.threadId, threadId))
    .orderBy(asc(schema.aiMessageTable.createdAt));
  return rows;
}

export async function listWorkspaceThreads(
  workspaceId: string,
  userId: string,
) {
  return db
    .select({
      id: schema.aiThreadTable.id,
      workspaceId: schema.aiThreadTable.workspaceId,
      title: schema.aiThreadTable.title,
      createdAt: schema.aiThreadTable.createdAt,
      updatedAt: schema.aiThreadTable.updatedAt,
    })
    .from(schema.aiThreadTable)
    .where(
      and(
        eq(schema.aiThreadTable.workspaceId, workspaceId),
        eq(schema.aiThreadTable.userId, userId),
      ),
    )
    .orderBy(desc(schema.aiThreadTable.updatedAt))
    .limit(100);
}
