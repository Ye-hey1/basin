import { client } from "@basin/libs";
import type { InferResponseType } from "hono/client";
import { HttpError } from "@/lib/http-error";

export type GetAiConfigResponse = InferResponseType<
  (typeof client)["ai"]["config"]["$get"],
  200
>;

export async function getAiConfig() {
  const response = await client.ai.config.$get();

  if (!response.ok) {
    throw await HttpError.fromResponse(response, "Request failed");
  }

  return await response.json();
}
