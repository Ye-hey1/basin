import {
  apiRouter,
  createRoute,
  errorResponse,
  jsonResponse,
  z,
} from "../openapi";
import { workspaceAccess } from "../utils/workspace-access-middleware";
import { describeAiConfig } from "./config";
import getAiConfig from "./controllers/get-ai-config";
import saveAiConfig from "./controllers/save-ai-config";
import { sendThreadMessage } from "./controllers/send-thread-message";
import {
  createThread,
  deleteThread,
  getThreadMessages,
  listThreads,
} from "./controllers/thread-crud";
import {
  aiConfigSchema,
  aiMessageListSchema,
  aiStatusSchema,
  aiThreadListSchema,
  aiThreadSchema,
} from "./response";
import {
  createThreadBody,
  saveAiConfigBody,
  sendMessageBody,
  threadIdParam,
  workspaceIdQuery,
} from "./schema";

const getAiStatusRoute = createRoute({
  method: "get",
  operationId: "getAiStatus",
  path: "/status",
  tags: ["AI"],
  summary: "Get AI status",
  description:
    "Whether AI is configured on this instance. Used by the web app to decide whether the assistant is available. Exposes no secrets.",
  responses: {
    200: jsonResponse("AI configuration status", aiStatusSchema),
  },
});

const getAiConfigRoute = createRoute({
  method: "get",
  operationId: "getAiConfig",
  path: "/config",
  tags: ["AI"],
  summary: "Get AI provider config",
  description:
    "Instance-level AI provider configuration. Instance admin only; the API key is never returned, only whether one is stored.",
  responses: {
    200: jsonResponse("AI provider configuration", aiConfigSchema),
    403: errorResponse("Instance admin access required"),
  },
});

const saveAiConfigRoute = createRoute({
  method: "put",
  operationId: "saveAiConfig",
  path: "/config",
  tags: ["AI"],
  summary: "Save AI provider config",
  description:
    "Create or replace the instance-level AI provider configuration. Validates the embedding model with a probe call and stores the detected dimensions. Omit apiKey to keep the stored secret; send an empty string to clear it.",
  request: {
    body: {
      required: true,
      content: { "application/json": { schema: saveAiConfigBody } },
    },
  },
  responses: {
    200: jsonResponse("The saved AI provider configuration", aiConfigSchema),
    400: errorResponse("Invalid body or provider validation failed"),
    403: errorResponse("Instance admin access required"),
  },
});

const createThreadRoute = createRoute({
  method: "post",
  operationId: "createAiThread",
  path: "/threads",
  tags: ["AI"],
  summary: "Create assistant thread",
  description: "Create a private assistant conversation thread in a workspace.",
  middleware: [workspaceAccess.fromBody()] as const,
  request: {
    body: {
      required: true,
      content: { "application/json": { schema: createThreadBody } },
    },
  },
  responses: {
    200: jsonResponse("The created thread", aiThreadSchema),
    400: errorResponse("Invalid body"),
    403: errorResponse("No access to the workspace"),
  },
});

const listThreadsRoute = createRoute({
  method: "get",
  operationId: "listAiThreads",
  path: "/threads",
  tags: ["AI"],
  summary: "List assistant threads",
  description:
    "List the current user's assistant threads in a workspace, most recently active first.",
  middleware: [workspaceAccess.fromQuery()] as const,
  request: { query: workspaceIdQuery },
  responses: {
    200: jsonResponse(
      "The user's threads in the workspace",
      aiThreadListSchema,
    ),
    400: errorResponse("The workspace could not be determined"),
    403: errorResponse("No access to the workspace"),
  },
});

const getThreadMessagesRoute = createRoute({
  method: "get",
  operationId: "getAiThreadMessages",
  path: "/threads/{id}/messages",
  tags: ["AI"],
  summary: "Get thread messages",
  description:
    "All messages in an assistant thread, oldest first. Threads are private to their owner.",
  request: { params: threadIdParam },
  responses: {
    200: jsonResponse("The thread's messages", aiMessageListSchema),
    404: errorResponse("Thread not found"),
  },
});

const deleteThreadRoute = createRoute({
  method: "delete",
  operationId: "deleteAiThread",
  path: "/threads/{id}",
  tags: ["AI"],
  summary: "Delete assistant thread",
  description: "Delete an assistant thread and its messages. Owner only.",
  request: { params: threadIdParam },
  responses: {
    200: jsonResponse(
      "The thread was deleted",
      z.object({ success: z.boolean() }),
    ),
    404: errorResponse("Thread not found"),
  },
});

const sendThreadMessageRoute = createRoute({
  method: "post",
  operationId: "sendAiThreadMessage",
  path: "/threads/{id}/messages",
  tags: ["AI"],
  summary: "Send assistant message",
  description:
    "Append a user message and stream the assistant's answer back as plain text chunks. The answer is grounded in Brain retrieval over the thread's workspace; citations are persisted on the assistant message and returned by the messages list route.",
  request: {
    params: threadIdParam,
    body: {
      required: true,
      content: { "application/json": { schema: sendMessageBody } },
    },
  },
  responses: {
    // All-raw responses (no zod schemas) so the handler can return a streaming
    // Response — same pattern as the /asset/{id} download route.
    200: {
      description: "The assistant's answer, streamed as UTF-8 text",
      content: {
        "text/plain": { schema: { type: "string" } },
      },
    },
    400: { description: "Invalid body" },
    404: { description: "Thread not found" },
    503: { description: "AI provider is not configured" },
  },
});

const ai = apiRouter()
  .openapi(getAiStatusRoute, async (c) => {
    const view = await describeAiConfig();
    return c.json(
      {
        configured: view.configured,
        source: view.source,
        provider: view.provider,
        chatModel: view.chatModel,
        embeddingModel: view.embeddingModel,
      },
      200,
    );
  })
  .openapi(getAiConfigRoute, async (c) => c.json(await getAiConfig(c), 200))
  .openapi(saveAiConfigRoute, async (c) =>
    c.json(await saveAiConfig(c, c.req.valid("json")), 200),
  )
  .openapi(createThreadRoute, async (c) => {
    const { workspaceId, title } = c.req.valid("json");
    return c.json(await createThread(c.get("userId"), workspaceId, title), 200);
  })
  .openapi(listThreadsRoute, async (c) => {
    const { workspaceId } = c.req.valid("query");
    return c.json(await listThreads(workspaceId, c.get("userId")), 200);
  })
  .openapi(getThreadMessagesRoute, async (c) => {
    const { id } = c.req.valid("param");
    return c.json(await getThreadMessages(id, c.get("userId")), 200);
  })
  .openapi(deleteThreadRoute, async (c) =>
    c.json(await deleteThread(c.req.valid("param").id, c.get("userId")), 200),
  )
  .openapi(sendThreadMessageRoute, async (c) => {
    const { id } = c.req.valid("param");
    const { content } = c.req.valid("json");
    const locale =
      c.req.header("accept-language")?.split(",")[0]?.trim() || "en";
    const chat = await sendThreadMessage({
      threadId: id,
      userId: c.get("userId"),
      content,
      locale,
    });

    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          for await (const chunk of chat.textStream) {
            controller.enqueue(encoder.encode(chunk));
          }
          controller.close();
        } catch (error) {
          controller.error(error);
        }
      },
      cancel() {
        void chat.consumeStream().catch(() => {});
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
        "X-Accel-Buffering": "no",
      },
    });
  });

export default ai;
