import {
  type AiProviderConfigInput,
  type AiProviderName,
  type AiRuntimeConfig,
  embedTexts,
  resolveEnvAiRuntimeConfig,
} from "@basin/ai";
import { desc, eq } from "drizzle-orm";
import db, { schema } from "../database";
import { decryptAiSecret, encryptAiSecret } from "./crypto";

// One provider configuration per instance. A singleton row would be cleaner
// with a CHECK constraint, but "latest row wins" keeps the table future-proof
// for per-workspace overrides without a migration.
export async function getProviderConfigRow() {
  const [row] = await db
    .select()
    .from(schema.aiProviderConfigTable)
    .orderBy(desc(schema.aiProviderConfigTable.createdAt))
    .limit(1);
  return row ?? null;
}

// Env config only counts when it names both models; half an env config is
// more likely a typo than an intention, and a wrong default is worse than
// "not configured".
function resolveEnvRuntimeConfig(): AiRuntimeConfig | null {
  const envConfig = resolveEnvAiRuntimeConfig();
  if (!envConfig?.chatModel || !envConfig.embeddingModel) {
    return null;
  }
  return envConfig;
}

export async function getAiRuntimeConfig(): Promise<AiRuntimeConfig | null> {
  const row = await getProviderConfigRow();
  if (row) {
    return {
      provider: row.provider as AiProviderName,
      baseUrl: row.baseUrl,
      apiKey: decryptAiSecret(row.apiKeyEncrypted),
      chatModel: row.chatModel,
      embeddingModel: row.embeddingModel,
      embeddingDimensions: row.embeddingDimensions,
    };
  }
  return resolveEnvRuntimeConfig();
}

export async function saveAiProviderConfig(
  input: AiProviderConfigInput & { embeddingDimensions?: number | null },
) {
  const row = await getProviderConfigRow();

  const values = {
    provider: input.provider,
    baseUrl: input.baseUrl?.trim() || null,
    // undefined keeps the stored key (edit without retyping the secret);
    // empty string clears it.
    apiKeyEncrypted:
      input.apiKey === undefined
        ? (row?.apiKeyEncrypted ?? null)
        : encryptAiSecret(input.apiKey),
    chatModel: input.chatModel.trim(),
    embeddingModel: input.embeddingModel.trim(),
    embeddingDimensions: input.embeddingDimensions ?? 1536,
  };

  if (row) {
    await db
      .update(schema.aiProviderConfigTable)
      .set(values)
      .where(eq(schema.aiProviderConfigTable.id, row.id));
    return;
  }

  await db.insert(schema.aiProviderConfigTable).values(values);
}

// The embedding model decides the dimensionality of every stored vector, so a
// probe call at save time is the only reliable validation: it fails fast on a
// bad model name and fills in the real dimensions instead of trusting input.
export async function probeEmbeddingDimensions(
  input: AiProviderConfigInput,
): Promise<number> {
  const { vectors, dimensions } = await embedTexts(
    {
      provider: input.provider,
      baseUrl: input.baseUrl ?? null,
      apiKey: input.apiKey ?? null,
      chatModel: input.chatModel,
      embeddingModel: input.embeddingModel,
      embeddingDimensions: input.embeddingDimensions ?? 0,
    },
    ["basin"],
  );

  if (vectors.length === 0) {
    throw new Error("Embedding probe returned no vectors");
  }
  return dimensions;
}

export type AiConfigView = {
  configured: boolean;
  source: "database" | "env" | "none";
  provider: AiProviderName | null;
  baseUrl: string | null;
  chatModel: string | null;
  embeddingModel: string | null;
  embeddingDimensions: number | null;
  apiKeyPresent: boolean;
};

export async function describeAiConfig(): Promise<AiConfigView> {
  const row = await getProviderConfigRow();
  if (row) {
    return {
      configured: true,
      source: "database",
      provider: row.provider as AiProviderName,
      baseUrl: row.baseUrl,
      chatModel: row.chatModel,
      embeddingModel: row.embeddingModel,
      embeddingDimensions: row.embeddingDimensions,
      apiKeyPresent: Boolean(row.apiKeyEncrypted),
    };
  }

  const envConfig = resolveEnvRuntimeConfig();
  if (envConfig) {
    return {
      configured: true,
      source: "env",
      provider: envConfig.provider,
      baseUrl: envConfig.baseUrl,
      chatModel: envConfig.chatModel,
      embeddingModel: envConfig.embeddingModel,
      embeddingDimensions: envConfig.embeddingDimensions,
      apiKeyPresent: Boolean(envConfig.apiKey),
    };
  }

  return {
    configured: false,
    source: "none",
    provider: null,
    baseUrl: null,
    chatModel: null,
    embeddingModel: null,
    embeddingDimensions: null,
    apiKeyPresent: false,
  };
}
