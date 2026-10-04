import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { Bot, Send } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import Markdown from "react-markdown";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { streamAiThreadMessage } from "@/fetchers/ai/send-thread-message";
import useCreateAiThread from "@/hooks/mutations/ai/use-create-thread";
import useGetAiStatus from "@/hooks/queries/ai/use-get-ai-status";
import useGetAiThreadMessages from "@/hooks/queries/ai/use-get-thread-messages";
import { cn } from "@/lib/cn";

// Mirrors the API's AiCitation response; sourceType stays a plain string
// because the response schema intentionally doesn't couple clients to the
// BrainSourceType union.
type Citation = {
  sourceType: string;
  sourceId: string;
  title: string;
  snippet: string;
  projectId: string | null;
};

type ChatMessage = {
  id: string;
  role: string;
  content: string;
  citations: Citation[] | null;
};

function CitationChips({
  citations,
  workspaceId,
}: {
  citations: Citation[];
  workspaceId: string;
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  if (citations.length === 0) return null;

  const open = (citation: Citation) => {
    if (citation.sourceType === "task" && citation.projectId) {
      void navigate({
        to: "/dashboard/workspace/$workspaceId/project/$projectId/task/$taskId_",
        params: {
          workspaceId,
          projectId: citation.projectId,
          taskId: citation.sourceId,
        },
      });
      return;
    }
    if (
      citation.sourceType === "requirement" ||
      citation.sourceType === "requirement_document"
    ) {
      void navigate({
        to: "/dashboard/workspace/$workspaceId/requirements",
        params: { workspaceId },
      });
    }
  };

  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {citations.map((citation, index) => {
        const label = `${index + 1}. ${citation.title}`;
        return (
          <button
            key={citation.sourceId}
            type="button"
            className="max-w-full truncate rounded-md border border-border bg-muted/50 px-2 py-0.5 text-xs text-muted-foreground hover:bg-muted"
            title={citation.snippet}
            onClick={() => open(citation)}
          >
            {label}
          </button>
        );
      })}
      {citations.length > 0 && (
        <span className="sr-only">{t("ai:assistant.citations")}</span>
      )}
    </div>
  );
}

function MessageBubble({
  message,
  workspaceId,
}: {
  message: ChatMessage;
  workspaceId: string;
}) {
  const isUser = message.role === "user";
  return (
    <div
      className={cn("flex w-full", isUser ? "justify-end" : "justify-start")}
    >
      <div
        className={cn(
          "max-w-[85%] rounded-lg px-3 py-2 text-sm",
          isUser
            ? "bg-primary text-primary-foreground"
            : "border border-border bg-card",
        )}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap break-words">{message.content}</p>
        ) : (
          <>
            <MarkdownLinkSafe content={message.content} />
            {message.citations && message.citations.length > 0 && (
              <CitationChips
                citations={message.citations}
                workspaceId={workspaceId}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}

// Answers are markdown; the wrapper classes keep default block elements from
// looking cramped without a typography plugin.
function MarkdownLinkSafe({ content }: { content: string }) {
  return (
    <div className="space-y-2 break-words [&_a]:underline [&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_code]:text-xs [&_li]:ml-4 [&_li]:list-disc [&_ol>li]:list-decimal [&_pre]:overflow-x-auto [&_pre]:rounded-md [&_pre]:bg-muted [&_pre]:p-2 [&_pre]:text-xs">
      <Markdown>{content}</Markdown>
    </div>
  );
}

export function Assistant({
  workspaceId,
  threadId,
  onThreadCreated,
}: {
  workspaceId: string;
  threadId: string | null;
  onThreadCreated?: (threadId: string) => void;
}) {
  const { t } = useTranslation();
  const { data: status } = useGetAiStatus();
  const createThread = useCreateAiThread();
  const queryClient = useQueryClient();

  const { data: messages = [], refetch: refetchMessages } =
    useGetAiThreadMessages(threadId ?? "");

  const [draft, setDraft] = useState("");
  const [pendingUser, setPendingUser] = useState<string | null>(null);
  const [streamingText, setStreamingText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const streaming = streamingText !== null || pendingUser !== null;

  // Switching conversations from the sidebar resets in-flight local state.
  // biome-ignore lint/correctness/useExhaustiveDependencies: threadId is an intentional reset trigger; the setters are the only calls.
  useEffect(() => {
    setDraft("");
    setError(null);
    setPendingUser(null);
    setStreamingText(null);
  }, [threadId]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: bottomRef is a stable scroll target; the effect tracks conversation content changes.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, streamingText, pendingUser]);

  const configured = status?.configured ?? false;

  async function handleSend() {
    const content = draft.trim();
    if (!content || streaming) return;

    setError(null);
    setDraft("");
    setPendingUser(content);

    try {
      let id = threadId;
      if (!id) {
        const thread = await createThread.mutateAsync({ workspaceId });
        id = thread.id;
        onThreadCreated?.(id);
      }

      setStreamingText("");
      await streamAiThreadMessage({
        threadId: id,
        content,
        onChunk: (chunk) => setStreamingText((prev) => (prev ?? "") + chunk),
      });
      await refetchMessages();
      // The first message titles the thread server-side; refresh the
      // sidebar conversation list.
      await queryClient.invalidateQueries({ queryKey: ["ai-threads"] });
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : t("ai:assistant.sendFailed"),
      );
      setDraft(content);
    } finally {
      setPendingUser(null);
      setStreamingText(null);
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      {!configured && (
        <div className="mx-auto w-full max-w-3xl px-4 pt-3">
          <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
            {t("ai:assistant.notConfigured")}
          </div>
        </div>
      )}

      <ScrollArea className="min-h-0 flex-1">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-3 px-4 py-4">
          {messages.length === 0 && !streaming && (
            <div className="flex flex-col items-center gap-2 py-20 text-center text-muted-foreground">
              <Bot className="size-8" />
              <p className="text-sm">{t("ai:assistant.empty")}</p>
            </div>
          )}
          {messages.map((message) => (
            <MessageBubble
              key={message.id}
              message={message}
              workspaceId={workspaceId}
            />
          ))}
          {pendingUser !== null && (
            <MessageBubble
              message={{
                id: "pending-user",
                role: "user",
                content: pendingUser,
                citations: null,
              }}
              workspaceId={workspaceId}
            />
          )}
          {streamingText !== null && (
            <div className="flex justify-start">
              <div className="max-w-[85%] rounded-lg border border-border bg-card px-3 py-2 text-sm">
                {streamingText.length > 0 ? (
                  <MarkdownLinkSafe content={streamingText} />
                ) : (
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <Spinner className="size-3" />
                    {t("ai:assistant.thinking")}
                  </span>
                )}
              </div>
            </div>
          )}
          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>

      <div className="mx-auto w-full max-w-3xl px-4 pb-4">
        <div className="flex items-end gap-2">
          <Textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                void handleSend();
              }
            }}
            placeholder={t("ai:assistant.placeholder")}
            rows={2}
            className="min-h-0 resize-none"
          />
          <Button
            size="icon"
            onClick={() => void handleSend()}
            disabled={!draft.trim() || streaming || !configured}
            aria-label={t("ai:assistant.send")}
          >
            {streaming ? (
              <Spinner className="size-4" />
            ) : (
              <Send className="size-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
