import { createFileRoute, useParams } from "@tanstack/react-router";
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  LayoutList,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import WorkspaceLayout from "@/components/common/workspace-layout";
import WorkspaceTabs from "@/components/common/workspace-tabs";
import PageTitle from "@/components/page-title";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ErrorDisplay } from "@/components/ui/error-display";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import useWorkspaceOverview from "@/hooks/queries/workspace/use-workspace-overview";

export const Route = createFileRoute(
  "/_layout/_authenticated/dashboard/workspace/$workspaceId/overview",
)({
  component: RouteComponent,
});

const STAT_CARDS = [
  {
    key: "total",
    icon: LayoutList,
    labelKey: "workspace:overview.totalTasks",
  },
  {
    key: "completed",
    icon: CheckCircle2,
    labelKey: "workspace:overview.completedTasks",
  },
  {
    key: "overdue",
    icon: AlertTriangle,
    labelKey: "workspace:overview.overdueTasks",
  },
  {
    key: "dueSoon",
    icon: CalendarClock,
    labelKey: "workspace:overview.dueSoonTasks",
  },
] as const;

function RouteComponent() {
  const { t } = useTranslation();
  const { workspaceId } = useParams({
    from: "/_layout/_authenticated/dashboard/workspace/$workspaceId/overview",
  });
  const { data, isLoading, isError, error } = useWorkspaceOverview(workspaceId);

  const content = isLoading ? (
    <OverviewSkeleton />
  ) : isError ? (
    <ErrorDisplay error={error} onRetry={() => window.location.reload()} />
  ) : data && data.totals.total > 0 ? (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {STAT_CARDS.map(({ key, icon: Icon, labelKey }) => (
          <Card key={key} className="gap-0 py-4">
            <CardHeader>
              <CardDescription className="flex items-center gap-1.5">
                <Icon className="size-3.5" />
                {t(labelKey)}
              </CardDescription>
              <CardTitle className="text-2xl">{data.totals[key]}</CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="space-y-2">
          <h2 className="font-medium text-sm">
            {t("workspace:overview.projectsTitle")}
          </h2>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-foreground font-medium">
                  {t("workspace:overview.projectColumn")}
                </TableHead>
                <TableHead className="text-foreground font-medium">
                  {t("workspace:overview.tasksColumn")}
                </TableHead>
                <TableHead className="w-32 text-foreground font-medium">
                  {t("workspace:overview.progressColumn")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.projects.map((project) => (
                <TableRow key={project.projectId}>
                  <TableCell className="py-2.5">{project.name}</TableCell>
                  <TableCell className="py-2.5 text-muted-foreground text-sm">
                    {project.completed}/{project.total}
                  </TableCell>
                  <TableCell className="py-2.5">
                    <div className="flex items-center gap-2">
                      <Progress
                        value={
                          project.total > 0
                            ? (project.completed / project.total) * 100
                            : 0
                        }
                        className="h-2 w-20"
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div className="space-y-2">
          <h2 className="font-medium text-sm">
            {t("workspace:overview.assigneesTitle")}
          </h2>
          <Card className="gap-2 py-4">
            <CardContent className="space-y-3">
              {data.assignees.map((assignee) => (
                <div key={assignee.assigneeId} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{assignee.name}</span>
                    <span className="text-muted-foreground">
                      {t("workspace:overview.openTasks", {
                        count: assignee.open,
                      })}
                    </span>
                  </div>
                  <Progress
                    value={
                      (Math.max(1, assignee.open) /
                        Math.max(1, data.assignees[0]?.open ?? 1)) *
                      100
                    }
                    className="h-1.5"
                  />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  ) : (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-2 text-center">
      <LayoutList className="size-8 text-muted-foreground/60" />
      <p className="font-medium text-sm">
        {t("workspace:overview.emptyTitle")}
      </p>
      <p className="max-w-sm text-muted-foreground text-sm">
        {t("workspace:overview.emptyDescription")}
      </p>
    </div>
  );

  return (
    <>
      <PageTitle title={t("workspace:overview.pageTitle")} />
      <WorkspaceLayout title={t("workspace:overview.pageTitle")}>
        <div className="mb-4">
          <WorkspaceTabs workspaceId={workspaceId} active="overview" />
        </div>
        {content}
      </WorkspaceLayout>
    </>
  );
}

function OverviewSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="gap-2 py-4">
            <CardHeader>
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-7 w-10" />
            </CardHeader>
          </Card>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Skeleton className="h-40" />
        <Skeleton className="h-40" />
      </div>
    </div>
  );
}
