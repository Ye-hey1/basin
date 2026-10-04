import { aiProviderConfigSchema } from "@basin/ai";
import { z } from "../openapi";

export const threadIdParam = z.object({ id: z.string().min(1) });

export const workspaceIdQuery = z.object({
  workspaceId: z.string().min(1),
});

export const createThreadBody = z.object({
  workspaceId: z.string().min(1),
  title: z.string().max(200).optional(),
});

export const sendMessageBody = z.object({
  content: z.string().min(1).max(16000),
});

// apiKey semantics on update: absent keeps the stored secret, empty string
// clears it. The zod schema from @basin/ai marks it nullish.
export const saveAiConfigBody = aiProviderConfigSchema;
