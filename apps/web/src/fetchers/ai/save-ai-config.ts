import { client } from "@basin/libs";
import type { InferResponseType } from "hono/client";
import { HttpError } from "@/lib/http-error";

export type SaveAiConfigResponse = InferResponseType<
  (typeof client)["ai"]["config"]["$put"],
  200
>;

export type SaveAiConfigRequest = {
  provider: "openai" | "anthropic" | "openai-compatible" | "ollama";
  baseUrl?: string | null;
  // Absent keeps the stored secret; empty string clears it.
  apiKey?: string | null;
  chatModel: string;
  embeddingModel: string;
  embeddingDimensions?: number | null;
};

export async function saveAiConfig(config: SaveAiConfigRequest) {
  const response = await client.ai.config.$put({ json: config });

  if (!response.ok) {
    throw await HttpError.fromResponse(response, "Request failed");
  }

  return await response.json();
}
