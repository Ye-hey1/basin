import { z } from "zod";

export const AI_PROVIDER_NAMES = [
  "openai",
  "anthropic",
  "openai-compatible",
  "ollama",
] as const;

export type AiProviderName = (typeof AI_PROVIDER_NAMES)[number];

export const aiProviderConfigSchema = z.object({
  provider: z.enum(AI_PROVIDER_NAMES),
  baseUrl: z.string().trim().url().max(2048).nullish(),
  apiKey: z.string().trim().max(4096).nullish(),
  chatModel: z.string().trim().min(1).max(256),
  embeddingModel: z.string().trim().min(1).max(256),
  embeddingDimensions: z.coerce.number().int().min(64).max(4096).nullish(),
});
export type AiProviderConfigInput = z.infer<typeof aiProviderConfigSchema>;

// Runtime shape consumed by the model factories: secrets resolved, defaults
// applied. The API layer builds this from the stored row or env fallbacks.
export type AiRuntimeConfig = {
  provider: AiProviderName;
  baseUrl: string | null;
  apiKey: string | null;
  chatModel: string;
  embeddingModel: string;
  embeddingDimensions: number;
};

// Where a Brain document came from. `url` is resolved by the web client per
// source type so the API never bakes frontend routes into data.
export type BrainSourceType =
  | "task"
  | "comment"
  | "requirement"
  | "requirement_document";

export type AiCitation = {
  sourceType: BrainSourceType;
  sourceId: string;
  title: string;
  snippet: string;
  score: number;
  // Carried for client-side deep links (task citations link into the board's
  // task route, which is nested under the project).
  projectId: string | null;
};

export const AI_EMBEDDING_BATCH_SIZE = 64;
