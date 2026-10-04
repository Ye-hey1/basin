import { embedMany } from "ai";
import { resolveEmbeddingModel } from "./provider";
import { AI_EMBEDDING_BATCH_SIZE, type AiRuntimeConfig } from "./types";

export type EmbeddingResult = {
  vectors: number[][];
  dimensions: number;
};

// Embedding APIs reject empty strings, and callers pass user-authored content
// that can contain blank sections; those are dropped rather than padded.
export async function embedTexts(
  config: AiRuntimeConfig,
  texts: string[],
): Promise<EmbeddingResult> {
  const usable = texts
    .map((text) => text.trim())
    .filter((text) => text.length > 0);

  if (usable.length === 0) {
    return { vectors: [], dimensions: config.embeddingDimensions };
  }

  const model = resolveEmbeddingModel(config);
  const vectors: number[][] = [];

  for (
    let offset = 0;
    offset < usable.length;
    offset += AI_EMBEDDING_BATCH_SIZE
  ) {
    const batch = usable.slice(offset, offset + AI_EMBEDDING_BATCH_SIZE);
    const { embeddings } = await embedMany({ model, values: batch });
    vectors.push(...embeddings);
  }

  const dimensions = vectors[0]?.length ?? 0;
  if (dimensions === 0) {
    throw new Error("Embedding provider returned an empty vector");
  }
  if (
    config.embeddingDimensions > 0 &&
    dimensions !== config.embeddingDimensions
  ) {
    throw new Error(
      `Embedding model returned ${dimensions} dimensions but the workspace index was built with ${config.embeddingDimensions}. Rebuild the Brain index after switching embedding models.`,
    );
  }

  return { vectors, dimensions };
}

// pgvector's text wire format for node-postgres, which has no native parser
// for the vector type.
export function toVectorLiteral(vector: number[]): string {
  return `[${vector.join(",")}]`;
}
