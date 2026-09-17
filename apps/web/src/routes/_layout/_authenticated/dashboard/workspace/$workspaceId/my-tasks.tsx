import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { CheckCircle2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import WorkspaceLayout from "@/components/common/workspace-layout";
import WorkspaceTabs from "@/components/common/workspace-tabs";
import PageTitle from "@/components/page-title";
import { ErrorDisplay } from "@/components/ui/error-display";
import { Skeleton } from "@/components/ui/skeleton";
import useMyTasks from "@/hooks/queries/workspace/use-my-tasks";
import { formatDateMedium } from "@/lib/format";
import { getPriorityIcon } from "@/lib/priority";
import { cn } from "@/lib/utils";

export const Route = createFileRoute(
  "/_layout/_authenticated/dashboard/workspace/$workspaceId/my-tasks",
)({
  component: RouteComponent,
});

function RouteComponent() {
  const { t } = useTranslation();
  const { workspaceId } = useParams({
    from: "/_layout/_authenticated/dashboard/workspace/$workspaceId/my-tasks",
  });
  const { data: tasks, isLoading, isError, error } = useMyTasks(workspaceId);

  const content = isLoading ? (
    <div className="space-y-2">
      {[1, 2, 3, 4].map((i) => (
        <Skeleton key={i} className="h-12 w-full" />
      ))}
    </div>
  ) : isError ? (
    <ErrorDisplay error={error} onRetry={() => window.location.reload()} />
  ) : tasks && tasks.length > 0 ? (
    <ul className="divide-y divide-border rounded-md border border-border">
      {tasks.map((task) => (
        <li key={task.id}>
          <Link
            to="/dashboard/workspace/$workspaceId/project/$projectId/task/$taskId"
            params={{
              workspaceId,
              projectId: task.projectId,
              taskId: task.id,
            }}
            className="flex items-center gap-3 px-3 py-2.5 transition-colors hover:bg-muted/40"
          >
            <span className="text-muted-foreground">
              {getPriorityIcon(task.priority)}
            </span>
            <span className="min-w-0 flex-1 truncate text-sm">
              {task.title}
            </span>
            <span className="hidden max-w-40 truncate text-muted-foreground text-xs sm:block">
              {task.projectName}
            </span>
            <span
              className={cn(
                "shrink-0 text-xs",
                task.dueDate &&
                  new Date(task.dueDate).getTime() < Date.now() &&
                  "text-warning-foreground",
                !task.dueDate && "text-muted-foreground/60",
              )}
            >
              {task.dueDate
                ? formatDateMedium(task.dueDate)
                : t("workspace:projects.noDueDate")}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  ) : (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-2 text-center">
      <CheckCircle2 className="size-8 text-muted-foreground/60" />
      <p className="font-medium text-sm">{t("workspace:myTasks.emptyTitle")}</p>
      <p className="max-w-sm text-muted-foreground text-sm">
        {t("workspace:myTasks.emptyDescription")}
      </p>
    </div>
  );

  return (
    <>
      <PageTitle title={t("workspace:myTasks.pageTitle")} />
      <WorkspaceLayout title={t("workspace:myTasks.pageTitle")}>
        <div className="mb-4">
          <WorkspaceTabs workspaceId={workspaceId} active="my-tasks" />
        </div>
        {content}
      </WorkspaceLayout>
    </>
  );
}
