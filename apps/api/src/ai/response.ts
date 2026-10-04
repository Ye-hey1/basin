import { responseTimestamp, z } from "../openapi";

export const aiStatusSchema = z
  .object({
    configured: z.boolean(),
    source: z.enum(["database", "env", "none"]),
    provider: z.string().nullable(),
    chatModel: z.string().nullable(),
    embeddingModel: z.string().nullable(),
  })
  .openapi("AiStatus");

export const aiConfigSchema = z
  .object({
    configured: z.boolean(),
    source: z.enum(["database", "env", "none"]),
    provider: z.string().nullable(),
    baseUrl: z.string().nullable(),
    chatModel: z.string().nullable(),
    embeddingModel: z.string().nullable(),
    embeddingDimensions: z.number().nullable(),
    apiKeyPresent: z.boolean(),
  })
  .openapi("AiConfig");

export const aiCitationSchema = z
  .object({
    sourceType: z.string(),
    sourceId: z.string(),
    title: z.string(),
    snippet: z.string(),
    score: z.number(),
    projectId: z.string().nullable(),
  })
  .openapi("AiCitation");

export const aiThreadSchema = z
  .object({
    id: z.string(),
    workspaceId: z.string(),
    title: z.string().nullable(),
    createdAt: responseTimestamp,
    updatedAt: responseTimestamp,
  })
  .openapi("AiThread");

export const aiThreadListSchema = z.array(aiThreadSchema);

export const aiMessageSchema = z
  .object({
    id: z.string(),
    role: z.string(),
    content: z.string(),
    citations: z.array(aiCitationSchema).nullable(),
    createdAt: responseTimestamp,
  })
  .openapi("AiMessage");

export const aiMessageListSchema = z.array(aiMessageSchema);
