import { useNavigate, useRouterState } from "@tanstack/react-router";
import { Trash2 } from "lucide-react";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import type { AiThreadSummary } from "@/fetchers/ai/get-threads";
import useDeleteAiThread from "@/hooks/mutations/ai/use-delete-thread";
import useGetAiThreads from "@/hooks/queries/ai/use-get-threads";
import useActiveWorkspace from "@/hooks/queries/workspace/use-active-workspace";
import { cn } from "@/lib/cn";

const DAY_MS = 86_400_000;

type ThreadGroup = {
  label: string;
  threads: AiThreadSummary[];
};

// Chat-client grouping: the conversation list is the primary navigation, so
// recency matters more than creation order.
function groupThreads(threads: AiThreadSummary[]): ThreadGroup[] {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const today = startOfToday.getTime();
  const yesterday = today - DAY_MS;
  const week = today - 7 * DAY_MS;

  const groups: Record<
    "today" | "yesterday" | "last7" | "earlier",
    AiThreadSummary[]
  > = {
    today: [],
    yesterday: [],
    last7: [],
    earlier: [],
  };

  for (const thread of threads) {
    const updated = new Date(thread.updatedAt).getTime();
    if (updated >= today) {
      groups.today.push(thread);
    } else if (updated >= yesterday) {
      groups.yesterday.push(thread);
    } else if (updated >= week) {
      groups.last7.push(thread);
    } else {
      groups.earlier.push(thread);
    }
  }

  return [
    { label: "today", threads: groups.today },
    { label: "yesterday", threads: groups.yesterday },
    { label: "last7", threads: groups.last7 },
    { label: "earlier", threads: groups.earlier },
  ].filter((group) => group.threads.length > 0);
}

export function NavConversations() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: workspace } = useActiveWorkspace();
  const { data: threads = [] } = useGetAiThreads(workspace?.id ?? "");
  const deleteThread = useDeleteAiThread();

  const activeThreadId = useRouterState({
    select: (state) => {
      const search = state.location.search as { threadId?: string };
      return search.threadId ?? null;
    },
  });

  const groups = useMemo(() => groupThreads(threads), [threads]);
  const onAssistantRoute = useRouterState({
    select: (state) => state.location.pathname === "/dashboard/assistant",
  });

  if (!workspace) return null;

  async function handleDelete(threadId: string) {
    await deleteThread.mutateAsync(threadId);
    if (activeThreadId === threadId) {
      void navigate({ to: "/dashboard/assistant", search: {} });
    }
  }

  return (
    <SidebarGroup className="gap-1 p-2">
      <SidebarGroupLabel className="h-7 px-0 text-sidebar-accent-foreground">
        {t("navigation:sidebar.conversations")}
      </SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu className="gap-0.5">
          {groups.length === 0 && (
            <p className="px-2 py-2 text-xs text-sidebar-foreground/50">
              {t("ai:assistant.noThreads")}
            </p>
          )}
          {groups.map((group) => (
            <div key={group.label} className="mb-1">
              <p className="px-2 pb-1 text-[11px] font-medium text-sidebar-foreground/40">
                {t(`navigation:sidebar.${group.label}`)}
              </p>
              {group.threads.map((thread) => {
                const isActive =
                  onAssistantRoute && activeThreadId === thread.id;
                return (
                  <SidebarMenuItem
                    key={thread.id}
                    className="group/conversation relative"
                  >
                    <SidebarMenuButton
                      isActive={isActive}
                      size="default"
                      className={cn(
                        "h-8 gap-2 rounded-md px-2 text-sm",
                        isActive
                          ? "bg-sidebar-accent text-sidebar-accent-foreground"
                          : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60",
                      )}
                      onClick={() =>
                        void navigate({
                          to: "/dashboard/assistant",
                          search: { threadId: thread.id },
                        })
                      }
                    >
                      <span className="min-w-0 flex-1 truncate text-start">
                        {thread.title || t("ai:assistant.untitledThread")}
                      </span>
                    </SidebarMenuButton>
                    <button
                      type="button"
                      aria-label={t("ai:assistant.deleteThread")}
                      className="absolute end-1.5 top-1/2 -translate-y-1/2 rounded-sm p-1 opacity-0 transition-opacity group-hover/conversation:opacity-100 hover:bg-sidebar-accent"
                      onClick={() => void handleDelete(thread.id)}
                    >
                      <Trash2 className="size-3.5 text-sidebar-foreground/50" />
                    </button>
                  </SidebarMenuItem>
                );
              })}
            </div>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

export default NavConversations;
