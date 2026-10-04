import { client } from "@basin/libs";
import type { InferResponseType } from "hono/client";
import { HttpError } from "@/lib/http-error";

export type GetAiStatusResponse = InferResponseType<
  (typeof client)["ai"]["status"]["$get"],
  200
>;

export async function getAiStatus() {
  const response = await client.ai.status.$get();

  if (!response.ok) {
    throw await HttpError.fromResponse(response, "Request failed");
  }

  return await response.json();
}
