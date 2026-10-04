import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Assistant } from "@/components/ai/assistant";
import Layout from "@/components/common/layout";
import PageTitle from "@/components/page-title";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import useActiveWorkspace from "@/hooks/queries/workspace/use-active-workspace";

export const Route = createFileRoute(
  "/_layout/_authenticated/dashboard/assistant",
)({
  component: AssistantPage,
});

function AssistantPage() {
  const { t } = useTranslation();
  const { data: workspace } = useActiveWorkspace();

  return (
    <>
      <PageTitle title={t("ai:assistant.pageTitle")} />
      <Layout>
        <Layout.Header>
          <div className="flex w-full items-center gap-1">
            <SidebarTrigger className="-ml-1 h-6 w-6" />
            <Separator
              orientation="vertical"
              className="mx-1.5 data-[orientation=vertical]:h-2.5"
            />
            <h1 className="text-xs text-card-foreground">
              {t("ai:assistant.header")}
            </h1>
          </div>
        </Layout.Header>
        <Layout.Content>
          <div className="h-[calc(100%-0.5rem)] p-4">
            {workspace?.id ? <Assistant workspaceId={workspace.id} /> : null}
          </div>
        </Layout.Content>
      </Layout>
    </>
  );
}
