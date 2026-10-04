import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import { useTranslation } from "react-i18next";
import { AiConfigForm } from "@/components/ai/ai-config-form";
import PageTitle from "@/components/page-title";
import { Button } from "@/components/ui/button";
import useActiveWorkspace from "@/hooks/queries/workspace/use-active-workspace";

export const Route = createFileRoute(
  "/_layout/_authenticated/dashboard/settings/ai",
)({
  component: AiSettingsPage,
});

function AiSettingsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: workspace } = useActiveWorkspace();

  return (
    <>
      <PageTitle title={t("ai:config.pageTitle")} />
      <div className="flex h-full w-full flex-col bg-sidebar p-2 sm:p-4">
        <div className="relative flex h-full min-h-0 flex-col gap-6 overflow-y-auto rounded-md border border-border bg-card p-3 sm:p-4">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="hidden md:inline-flex"
              onClick={() => {
                if (!workspace?.id) return;
                navigate({
                  to: "/dashboard/workspace/$workspaceId",
                  params: { workspaceId: workspace.id },
                });
              }}
            >
              <ChevronLeft />
              {t("navigation:page.backToWorkspace")}
            </Button>
          </div>

          <div>
            <h1 className="text-xl font-semibold">{t("ai:config.title")}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("ai:config.subtitle")}
            </p>
          </div>

          <AiConfigForm />
        </div>
      </div>
    </>
  );
}
