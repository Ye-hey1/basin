import { client } from "@basin/libs";
import { HttpError } from "@/lib/http-error";

export async function deleteAiThread(threadId: string) {
  const response = await client.ai.threads[":id"].$delete({
    param: { id: threadId },
  });

  if (!response.ok) {
    throw await HttpError.fromResponse(response, "Request failed");
  }

  return await response.json();
}
