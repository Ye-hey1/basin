import {
  type AiCitation,
  buildAssistantSystemPrompt,
  buildRagContextBlock,
  type RagSource,
  resolveChatModel,
} from "@basin/ai";
import type { ModelMessage } from "ai";
import { streamText } from "ai";
import { asc, eq } from "drizzle-orm";
import db, { schema } from "../../database";
import { httpError } from "../../utils/http-error";
import { getAiRuntimeConfig } from "../config";
import { retrieveBrainContext, toCitations } from "../pipeline";
import { loadOwnedThread } from "../thread";

type ChatStream = ReturnType<typeof streamText>;

async function persistAssistantMessage(
  threadId: string,
  chat: ChatStream,
  citations: AiCitation[],
) {
  try {
    const text = await chat.text;
    if (text.trim().length === 0) {
      return;
    }
    await db.insert(schema.aiMessageTable).values({
      threadId,
      role: "assistant",
      content: text,
      citations,
    });
  } catch (error) {
    console.error("[ai] failed to persist assistant message:", error);
  }
}

export async function sendThreadMessage(options: {
  threadId: string;
  userId: string;
  content: string;
  locale: string;
}) {
  const thread = await loadOwnedThread(options.threadId, options.userId);

  const config = await getAiRuntimeConfig();
  if (!config) {
    throw httpError(
      503,
      "ai_not_configured",
      "AI provider is not configured. An instance admin can set it up in settings.",
    );
  }

  const [workspace] = await db
    .select({ name: schema.workspaceTable.name })
    .from(schema.workspaceTable)
    .where(eq(schema.workspaceTable.id, thread.workspaceId))
    .limit(1);

  await db.insert(schema.aiMessageTable).values({
    threadId: thread.id,
    role: "user",
    content: options.content,
  });

  if (!thread.title) {
    await db
      .update(schema.aiThreadTable)
      .set({ title: options.content.slice(0, 80) })
      .where(eq(schema.aiThreadTable.id, thread.id));
  }

  // Newest 40 first, then restored to chronological order: the model sees the
  // tail of long threads, and the just-persisted user message is the last one.
  const historyRows = await db
    .select({
      role: schema.aiMessageTable.role,
      content: schema.aiMessageTable.content,
    })
    .from(schema.aiMessageTable)
    .where(eq(schema.aiMessageTable.threadId, thread.id))
    .orderBy(asc(schema.aiMessageTable.createdAt));
  const history = historyRows.slice(-40);

  const sources: RagSource[] = await retrieveBrainContext({
    workspaceId: thread.workspaceId,
    query: options.content,
  });

  const contextBlock = buildRagContextBlock(sources);
  const system = [
    buildAssistantSystemPrompt({
      locale: options.locale,
      workspaceName: workspace?.name ?? "Basin",
      hasContext: sources.length > 0,
    }),
    contextBlock,
  ]
    .filter(Boolean)
    .join("\n\n");

  const messages: ModelMessage[] = history.map((message) => ({
    role: message.role === "assistant" ? "assistant" : "user",
    content: message.content,
  }));

  const chat = streamText({
    model: resolveChatModel(config),
    system,
    messages,
    temperature: 0.3,
    maxOutputTokens: 4096,
    onError: ({ error }: { error: unknown }) => {
      console.error("[ai] chat stream error:", error);
    },
  });

  void persistAssistantMessage(thread.id, chat, toCitations(sources));

  return chat;
}
