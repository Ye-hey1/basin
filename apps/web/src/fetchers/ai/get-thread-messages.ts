import { client } from "@basin/libs";
import type { InferResponseType } from "hono/client";
import { HttpError } from "@/lib/http-error";

export type AiMessage = InferResponseType<
  (typeof client)["ai"]["threads"][":id"]["messages"]["$get"],
  200
>[number];

export async function getAiThreadMessages(threadId: string) {
  const response = await client.ai.threads[":id"].messages.$get({
    param: { id: threadId },
  });

  if (!response.ok) {
    throw await HttpError.fromResponse(response, "Request failed");
  }

  return await response.json();
}
