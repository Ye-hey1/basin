import { client } from "@basin/libs";
import { HttpError } from "@/lib/http-error";

async function markAllNotificationsAsRead() {
  const response = await client.notification["read-all"].$patch();

  if (!response.ok) {
    throw await HttpError.fromResponse(response, "Request failed");
  }

  const data = await response.json();
  return data;
}

export default markAllNotificationsAsRead;
