import { and, eq } from "drizzle-orm";
import db, { schema } from "../../database";
import {
  listThreadMessages,
  listWorkspaceThreads,
  loadOwnedThread,
} from "../thread";

export async function createThread(
  userId: string,
  workspaceId: string,
  title?: string,
) {
  const [thread] = await db
    .insert(schema.aiThreadTable)
    .values({ userId, workspaceId, title: title ?? null })
    .returning({
      id: schema.aiThreadTable.id,
      workspaceId: schema.aiThreadTable.workspaceId,
      title: schema.aiThreadTable.title,
      createdAt: schema.aiThreadTable.createdAt,
      updatedAt: schema.aiThreadTable.updatedAt,
    });

  if (!thread) {
    throw new Error("Failed to create AI thread");
  }
  return thread;
}

export async function listThreads(workspaceId: string, userId: string) {
  return listWorkspaceThreads(workspaceId, userId);
}

export async function deleteThread(threadId: string, userId: string) {
  await loadOwnedThread(threadId, userId);
  await db
    .delete(schema.aiThreadTable)
    .where(
      and(
        eq(schema.aiThreadTable.id, threadId),
        eq(schema.aiThreadTable.userId, userId),
      ),
    );
  return { success: true };
}

export async function getThreadMessages(threadId: string, userId: string) {
  await loadOwnedThread(threadId, userId);
  return listThreadMessages(threadId);
}
