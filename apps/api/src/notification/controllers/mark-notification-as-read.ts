import { and, eq } from "drizzle-orm";
import db from "../../database";
import { notificationTable } from "../../database/schema";
import { httpError } from "../../utils/http-error";

async function markNotificationAsRead(id: string, userId: string) {
  const [notification] = await db
    .update(notificationTable)
    .set({ isRead: true })
    .where(
      and(eq(notificationTable.id, id), eq(notificationTable.userId, userId)),
    )
    .returning();

  if (!notification) {
    throw httpError(404, "notification_not_found", "Notification not found");
  }

  return notification;
}

export default markNotificationAsRead;
