import { client } from "@basin/libs";
import { HttpError } from "@/lib/http-error";

async function getNotifications() {
  const response = await client.notification.$get();

  if (!response.ok) {
    throw await HttpError.fromResponse(response, "Request failed");
  }

  const data = await response.json();
  return data;
}

export default getNotifications;
