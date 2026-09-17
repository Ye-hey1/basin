import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/cn";

type WorkspaceTabsProps = {
  workspaceId: string;
  active: "projects" | "overview" | "requirements" | "my-tasks";
};

function WorkspaceTabs({ workspaceId, active }: WorkspaceTabsProps) {
  const { t } = useTranslation();

  const tabClass = (isActive: boolean) =>
    cn(
      "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
      isActive
        ? "bg-background text-foreground shadow-sm"
        : "text-muted-foreground hover:text-foreground",
    );

  return (
    <div className="inline-flex rounded-md border border-border bg-sidebar p-0.5">
      <Link
        to="/dashboard/workspace/$workspaceId"
        params={{ workspaceId }}
        className={tabClass(active === "projects")}
      >
        {t("workspace:projects.pageTitle")}
      </Link>
      <Link
        to="/dashboard/workspace/$workspaceId/overview"
        params={{ workspaceId }}
        className={tabClass(active === "overview")}
      >
        {t("workspace:overview.pageTitle")}
      </Link>
      <Link
        to="/dashboard/workspace/$workspaceId/my-tasks"
        params={{ workspaceId }}
        className={tabClass(active === "my-tasks")}
      >
        {t("workspace:myTasks.pageTitle")}
      </Link>
      <Link
        to="/dashboard/workspace/$workspaceId/requirements"
        params={{ workspaceId }}
        className={tabClass(active === "requirements")}
      >
        {t("requirements:pageTitle")}
      </Link>
    </div>
  );
}

export default WorkspaceTabs;
