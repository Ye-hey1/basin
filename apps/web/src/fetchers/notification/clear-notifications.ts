import { client } from "@basin/libs";
import { HttpError } from "@/lib/http-error";

async function clearNotifications() {
  const response = await client.notification["clear-all"].$delete();

  if (!response.ok) {
    throw await HttpError.fromResponse(response, "Request failed");
  }

  const data = await response.json();
  return data;
}

export default clearNotifications;
