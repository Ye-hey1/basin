import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAI } from "@ai-sdk/openai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import type { EmbeddingModel, LanguageModel } from "ai";
import type { AiProviderName, AiRuntimeConfig } from "./types";

class AiConfigError extends Error {}

function openAiCompatibleBaseUrl(config: AiRuntimeConfig): string {
  if (config.baseUrl?.trim()) {
    return config.baseUrl.trim().replace(/\/+$/, "");
  }
  if (config.provider === "ollama") {
    return "http://localhost:11434/v1";
  }
  throw new AiConfigError(
    `Provider "${config.provider}" requires a baseUrl (e.g. https://open.bigmodel.cn/api/paas/v4)`,
  );
}

export function resolveChatModel(config: AiRuntimeConfig): LanguageModel {
  switch (config.provider) {
    case "openai": {
      const openai = createOpenAI({
        apiKey: config.apiKey || undefined,
        baseURL: config.baseUrl || undefined,
      });
      return openai.chat(config.chatModel);
    }
    case "anthropic": {
      const anthropic = createAnthropic({ apiKey: config.apiKey || undefined });
      return anthropic(config.chatModel);
    }
    case "openai-compatible":
    case "ollama": {
      const compatible = createOpenAICompatible({
        name: config.provider,
        baseURL: openAiCompatibleBaseUrl(config),
        apiKey: config.apiKey || undefined,
      });
      return compatible(config.chatModel);
    }
  }
}

export function resolveEmbeddingModel(
  config: AiRuntimeConfig,
): EmbeddingModel<NoInfer<string>> {
  if (config.provider === "anthropic") {
    throw new AiConfigError(
      "Anthropic does not provide an embedding model; configure OpenAI, an OpenAI-compatible endpoint, or Ollama for embeddings",
    );
  }

  switch (config.provider) {
    case "openai": {
      const openai = createOpenAI({
        apiKey: config.apiKey || undefined,
        baseURL: config.baseUrl || undefined,
      });
      return openai.textEmbeddingModel(config.embeddingModel);
    }
    case "openai-compatible":
    case "ollama": {
      const compatible = createOpenAICompatible({
        name: config.provider,
        baseURL: openAiCompatibleBaseUrl(config),
        apiKey: config.apiKey || undefined,
      });
      return compatible.textEmbeddingModel(config.embeddingModel);
    }
  }
}

// Instance-level fallback when no ai_provider_config row exists yet: admins can
// bootstrap purely from environment variables (12-factor style), which also
// gives self-hosters a zero-UI setup path.
export function resolveEnvAiRuntimeConfig(): AiRuntimeConfig | null {
  const provider = process.env.AI_PROVIDER?.trim();
  if (!provider) {
    return null;
  }

  const dimensions = process.env.AI_EMBEDDING_DIMENSIONS?.trim();

  return {
    provider: provider as AiProviderName,
    baseUrl: process.env.AI_BASE_URL?.trim() || null,
    apiKey: process.env.AI_API_KEY?.trim() || null,
    chatModel: process.env.AI_CHAT_MODEL?.trim() || "",
    embeddingModel: process.env.AI_EMBEDDING_MODEL?.trim() || "",
    embeddingDimensions: dimensions ? Number(dimensions) : 1536,
  };
}
