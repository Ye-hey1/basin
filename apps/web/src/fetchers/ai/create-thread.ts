import { client } from "@basin/libs";
import type { InferResponseType } from "hono/client";
import { HttpError } from "@/lib/http-error";

export type AiThread = InferResponseType<
  (typeof client)["ai"]["threads"]["$post"],
  200
>;

export async function createAiThread({
  workspaceId,
  title,
}: {
  workspaceId: string;
  title?: string;
}) {
  const response = await client.ai.threads.$post({
    json: { workspaceId, title },
  });

  if (!response.ok) {
    throw await HttpError.fromResponse(response, "Request failed");
  }

  return await response.json();
}
