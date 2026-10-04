import { getApiUrl } from "@/fetchers/get-api-url";
import { HttpError } from "@/lib/http-error";

// Streaming endpoint: the answer comes back as plain-text chunks, not the
// typed JSON envelope, so this fetcher bypasses the hono client on purpose.
export async function streamAiThreadMessage(options: {
  threadId: string;
  content: string;
  onChunk: (text: string) => void;
}) {
  const response = await fetch(
    getApiUrl(`/ai/threads/${options.threadId}/messages`),
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ content: options.content }),
    },
  );

  if (!response.ok) {
    throw await HttpError.fromResponse(response, "Request failed");
  }

  if (!response.body) {
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    options.onChunk(decoder.decode(value, { stream: true }));
  }
}
