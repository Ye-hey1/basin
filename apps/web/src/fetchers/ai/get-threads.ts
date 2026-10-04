import { client } from "@basin/libs";
import type { InferResponseType } from "hono/client";
import { HttpError } from "@/lib/http-error";

export type AiThreadSummary = InferResponseType<
  (typeof client)["ai"]["threads"]["$get"],
  200
>[number];

export async function getAiThreads(workspaceId: string) {
  const response = await client.ai.threads.$get({
    query: { workspaceId },
  });

  if (!response.ok) {
    throw await HttpError.fromResponse(response, "Request failed");
  }

  return await response.json();
}
