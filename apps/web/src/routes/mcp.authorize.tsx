import {
  createFileRoute,
  useNavigate,
  useSearch,
} from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { z } from "zod/v4";
import { AuthLayout } from "@/components/auth/layout";
import { Button } from "@/components/ui/button";
import { useMcpAuthorizationDecision } from "@/hooks/mutations/mcp/use-authorization-decision";
import { useMcpAuthorizationRequest } from "@/hooks/queries/mcp/use-authorization-request";
import { authClient } from "@/lib/auth-client";

const authorizationSearchSchema = z.object({
  request_id: z.string().optional(),
});

export const Route = createFileRoute("/mcp/authorize")({
  component: McpAuthorizePage,
  validateSearch: authorizationSearchSchema,
});

function McpAuthorizePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const search = useSearch({ from: "/mcp/authorize" });
  const requestId = search.request_id ?? "";
  const request = useMcpAuthorizationRequest(requestId);
  const decision = useMcpAuthorizationDecision();
  const { data: session, isPending: isSessionPending } =
    authClient.useSession();

  if (!requestId || request.isError) {
    return (
      <AuthLayout
        title={t("auth:mcpAuthorize.failedTitle")}
        subtitle={t("auth:mcpAuthorize.failedSubtitle")}
      >
        <p className="text-sm text-muted-foreground">
          {t("auth:mcpAuthorize.returnToClient")}
        </p>
      </AuthLayout>
    );
  }

  if (request.isLoading || isSessionPending) {
    return (
      <AuthLayout
        title={t("auth:mcpAuthorize.authorizeTitle")}
        subtitle={t("auth:mcpAuthorize.loadingSubtitle")}
      >
        <p className="text-sm text-muted-foreground">
          {t("auth:mcpAuthorize.checkingRequest")}
        </p>
      </AuthLayout>
    );
  }

  if (!session?.user) {
    const redirectTarget = `/mcp/authorize?request_id=${encodeURIComponent(requestId)}`;
    return (
      <AuthLayout
        title={t("auth:mcpAuthorize.signInTitle")}
        subtitle={t("auth:mcpAuthorize.signInSubtitle")}
      >
        <Button
          type="button"
          className="w-full"
          onClick={() =>
            void navigate({
              to: "/auth/sign-in",
              search: { redirect: redirectTarget },
            })
          }
        >
          {t("auth:mcpAuthorize.signIn")}
        </Button>
      </AuthLayout>
    );
  }

  const submitDecision = (approved: boolean) => {
    decision.mutate(
      { requestId, approved },
      {
        onSuccess: (redirect) => window.location.assign(redirect),
      },
    );
  };

  return (
    <AuthLayout
      title={t("auth:mcpAuthorize.authorizeTitle")}
      subtitle={t("auth:mcpAuthorize.reviewSubtitle")}
    >
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          {t("auth:mcpAuthorize.accessWarning")}
        </p>
        <div className="space-y-3 rounded-md border bg-muted/40 p-3">
          <div>
            <p className="text-xs font-medium text-muted-foreground">
              {t("auth:mcpAuthorize.clientNameLabel")}
            </p>
            <p className="mt-1 text-sm">
              {request.data?.clientName ??
                t("auth:mcpAuthorize.clientFallback")}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground">
              {t("auth:mcpAuthorize.redirectUriLabel")}
            </p>
            <p className="mt-1 break-all font-mono text-xs">
              {request.data?.redirectUri}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            className="flex-1"
            loading={decision.isPending && decision.variables?.approved}
            disabled={decision.isPending}
            onClick={() => submitDecision(true)}
          >
            {t("auth:mcpAuthorize.approve")}
          </Button>
          <Button
            type="button"
            variant="outline"
            loading={decision.isPending && !decision.variables?.approved}
            disabled={decision.isPending}
            onClick={() => submitDecision(false)}
          >
            {t("auth:mcpAuthorize.deny")}
          </Button>
        </div>
      </div>
    </AuthLayout>
  );
}
