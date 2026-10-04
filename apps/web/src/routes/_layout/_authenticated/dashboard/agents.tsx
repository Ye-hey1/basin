import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { AgentsManager } from "@/components/agents/agents-manager";
import Layout from "@/components/common/layout";
import PageTitle from "@/components/page-title";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import useActiveWorkspace from "@/hooks/queries/workspace/use-active-workspace";

export const Route = createFileRoute(
  "/_layout/_authenticated/dashboard/agents",
)({
  component: AgentsPage,
});

function AgentsPage() {
  const { t } = useTranslation();
  const { data: workspace } = useActiveWorkspace();

  return (
    <>
      <PageTitle title={t("agents:pageTitle")} />
      <Layout>
        <Layout.Header>
          <div className="flex w-full items-center gap-1">
            <SidebarTrigger className="-ml-1 h-6 w-6" />
            <Separator
              orientation="vertical"
              className="mx-1.5 data-[orientation=vertical]:h-2.5"
            />
            <h1 className="text-xs text-card-foreground">
              {t("agents:header")}
            </h1>
          </div>
        </Layout.Header>
        <Layout.Content>
          {workspace?.id ? <AgentsManager workspaceId={workspace.id} /> : null}
        </Layout.Content>
      </Layout>
    </>
  );
}
