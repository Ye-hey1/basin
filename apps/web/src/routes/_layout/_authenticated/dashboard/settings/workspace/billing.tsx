import { createFileRoute } from "@tanstack/react-router";
import { ArrowUpRight, Check, Sparkles, TriangleAlert } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import PageTitle from "@/components/page-title";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";
import {
  useCreateCheckout,
  useOpenBillingPortal,
} from "@/hooks/mutations/billing/use-billing-actions";
import { useGetBilling } from "@/hooks/queries/billing/use-get-billing";
import { useWorkspacePermission } from "@/hooks/use-workspace-permission";
import { cn } from "@/lib/cn";

export const Route = createFileRoute(
  "/_layout/_authenticated/dashboard/settings/workspace/billing",
)({
  component: RouteComponent,
});

type Interval = "monthly" | "annual";
type PlanKey = "personal" | "team";

const PLANS: { plan: PlanKey; highlighted?: boolean }[] = [
  { plan: "personal" },
  { plan: "team", highlighted: true },
];

const PLAN_PRICES: Record<PlanKey, { monthly: string; annual: string }> = {
  personal: { monthly: "$4", annual: "$40" },
  team: { monthly: "$5", annual: "$50" },
};

const STATUS_VARIANTS: Record<
  string,
  "success" | "warning" | "error" | "secondary"
> = {
  active: "success",
  trialing: "success",
  past_due: "warning",
  scheduled_cancel: "warning",
  canceled: "error",
  expired: "error",
  paused: "secondary",
};

function formatDate(value: string | null | undefined) {
  if (!value) return null;
  return new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function daysUntil(value: string | null | undefined) {
  if (!value) return null;
  const ms = new Date(value).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / (24 * 60 * 60 * 1000)));
}

function SectionHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  return (
    <div className="space-y-1">
      <h2 className="font-medium text-md">{title}</h2>
      <p className="text-muted-foreground text-xs">{subtitle}</p>
    </div>
  );
}

function RouteComponent() {
  const { t } = useTranslation();
  const { workspace, isAdmin } = useWorkspacePermission();
  const workspaceId = workspace?.id;
  const canManage = isAdmin;

  const { data: billing, isLoading } = useGetBilling(workspaceId);
  const checkout = useCreateCheckout(workspaceId);
  const portal = useOpenBillingPortal(workspaceId);
  const [interval, setInterval] = useState<Interval>("annual");

  if (isLoading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (!billing?.billingEnabled) {
    return (
      <>
        <PageTitle title={t("settings:billingPage.title")} />
        <div className="mx-auto max-w-4xl space-y-2">
          <h1 className="font-semibold text-2xl">
            {t("settings:billingPage.title")}
          </h1>
          <p className="text-muted-foreground text-sm">
            {t("settings:billingPage.disabledDescription")}
          </p>
        </div>
      </>
    );
  }

  const hasSubscription = Boolean(billing.plan && billing.status);
  const statusVariant = billing.status ? STATUS_VARIANTS[billing.status] : null;
  const statusLabel =
    billing.status && statusVariant
      ? t(`settings:billingPage.status.${billing.status}`)
      : null;
  const renews = formatDate(billing.currentPeriodEnd);
  const trialDaysLeft = daysUntil(billing.trialEndsAt);
  const trialExpired =
    !billing.foundingFree && !hasSubscription && trialDaysLeft === 0;

  const planName = billing.plan
    ? t(`settings:billingPage.plans.${billing.plan}.name`)
    : null;

  const planCopy = {
    personal: {
      name: t("settings:billingPage.plans.personal.name"),
      tagline: t("settings:billingPage.plans.personal.tagline"),
      features: [
        t("settings:billingPage.plans.personal.featureSingleUser"),
        t("settings:billingPage.plans.personal.featureUnlimited"),
        t("settings:billingPage.plans.personal.featureBackups"),
        t("settings:billingPage.plans.personal.featureSupport"),
      ],
      suffix:
        interval === "monthly"
          ? t("settings:billingPage.price.perMonth")
          : t("settings:billingPage.price.perYear"),
      note:
        interval === "annual"
          ? t("settings:billingPage.price.personalAnnualNote")
          : t("settings:billingPage.price.billedMonthly"),
    },
    team: {
      name: t("settings:billingPage.plans.team.name"),
      tagline: t("settings:billingPage.plans.team.tagline"),
      features: [
        t("settings:billingPage.plans.team.featureMembers"),
        t("settings:billingPage.plans.team.featureUnlimited"),
        t("settings:billingPage.plans.team.featureRoles"),
        t("settings:billingPage.plans.team.featureBackups"),
        t("settings:billingPage.plans.team.featureSupport"),
      ],
      suffix:
        interval === "monthly"
          ? t("settings:billingPage.price.perUserPerMonth")
          : t("settings:billingPage.price.perUserPerYear"),
      note:
        interval === "annual"
          ? t("settings:billingPage.price.teamAnnualNote")
          : t("settings:billingPage.price.billedMonthly"),
    },
  } satisfies Record<
    PlanKey,
    {
      name: string;
      tagline: string;
      features: string[];
      suffix: string;
      note: string;
    }
  >;

  return (
    <>
      <PageTitle title={t("settings:billingPage.title")} />
      <div className="mx-auto max-w-4xl space-y-8">
        <div className="space-y-2">
          <h1 className="font-semibold text-2xl">
            {t("settings:billingPage.title")}
          </h1>
          <p className="text-muted-foreground">
            {t("settings:billingPage.subtitle")}
          </p>
        </div>

        {/* ── Current plan ── */}
        <div className="space-y-6">
          <SectionHeader
            title={t("settings:billingPage.currentPlan")}
            subtitle={t("settings:billingPage.currentPlanSubtitle")}
          />

          {billing.foundingFree ? (
            <div className="overflow-hidden rounded-md border border-primary/30 bg-sidebar">
              <div className="flex items-start gap-3 p-5">
                <div className="mt-0.5 flex size-9 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <Sparkles className="size-4.5" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-sm">
                      {t("settings:billingPage.foundingFree")}
                    </h3>
                    <Badge variant="success" size="sm">
                      {t("settings:billingPage.freeBadge")}
                    </Badge>
                  </div>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {t("settings:billingPage.foundingFreeDescription")}
                  </p>
                </div>
              </div>
            </div>
          ) : hasSubscription ? (
            <div className="rounded-md border border-border bg-sidebar">
              <div className="flex flex-wrap items-start justify-between gap-4 p-5">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-sm">
                      {t("settings:billingPage.cloudPlan", {
                        plan: planName ?? "",
                      })}
                    </h3>
                    {statusVariant && statusLabel ? (
                      <Badge variant={statusVariant} size="sm">
                        {statusLabel}
                      </Badge>
                    ) : null}
                  </div>
                  <p className="text-muted-foreground text-sm">
                    {billing.plan === "team"
                      ? `$${billing.billingInterval === "annual" ? 50 : 5}${billing.billingInterval === "annual" ? t("settings:billingPage.price.perUserPerYear") : t("settings:billingPage.price.perUserPerMonth")}`
                      : `$${billing.billingInterval === "annual" ? 40 : 4}${billing.billingInterval === "annual" ? t("settings:billingPage.price.perYear") : t("settings:billingPage.price.perMonth")}`}
                    {billing.seats > 1
                      ? ` · ${t("settings:billingPage.seats", { count: billing.seats })}`
                      : null}
                  </p>
                </div>
                <div className="text-right">
                  {renews ? (
                    <p className="text-muted-foreground text-xs">
                      {billing.canceledAt
                        ? t("settings:billingPage.accessEnds")
                        : t("settings:billingPage.renews")}
                    </p>
                  ) : null}
                  {renews ? (
                    <p className="font-medium text-sm">{renews}</p>
                  ) : null}
                </div>
              </div>
              <Separator />
              <div className="flex flex-col items-start gap-3 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-muted-foreground text-xs">
                  {t("settings:billingPage.billingPortalHint")}
                </p>
                {billing.hasCustomer ? (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!canManage || portal.isPending}
                    onClick={() => portal.mutate()}
                  >
                    {portal.isPending
                      ? t("settings:billingPage.opening")
                      : t("settings:billingPage.manageBilling")}
                    <ArrowUpRight className="size-4" />
                  </Button>
                ) : null}
              </div>
            </div>
          ) : (
            <div
              className={cn(
                "rounded-md border bg-sidebar p-5",
                trialExpired ? "border-warning/40" : "border-border",
              )}
            >
              <div className="flex items-start gap-3">
                <div
                  className={cn(
                    "mt-0.5 flex size-9 items-center justify-center rounded-md",
                    trialExpired
                      ? "bg-warning/10 text-warning-foreground"
                      : "bg-primary/10 text-primary",
                  )}
                >
                  {trialExpired ? (
                    <TriangleAlert className="size-4.5" />
                  ) : (
                    <Sparkles className="size-4.5" />
                  )}
                </div>
                <div className="space-y-1">
                  <h3 className="font-medium text-sm">
                    {trialExpired
                      ? t("settings:billingPage.trialEnded")
                      : t("settings:billingPage.freeTrial")}
                  </h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {trialExpired
                      ? t("settings:billingPage.trialEndedDescription")
                      : trialDaysLeft !== null
                        ? t("settings:billingPage.trialDaysLeft", {
                            count: trialDaysLeft,
                          })
                        : t("settings:billingPage.choosePlanAfterTrial")}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Plan picker ── */}
        {!billing.foundingFree && !hasSubscription ? (
          <div className="space-y-6">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <SectionHeader
                title={t("settings:billingPage.choosePlan")}
                subtitle={t("settings:billingPage.choosePlanSubtitle")}
              />
              <div className="inline-flex items-center gap-2">
                <div className="inline-flex rounded-md border border-border bg-sidebar p-0.5 text-xs">
                  {(["monthly", "annual"] as const).map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setInterval(value)}
                      className={cn(
                        "rounded-[0.3rem] px-3 py-1 font-medium transition-colors",
                        interval === value
                          ? "bg-background text-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {value === "monthly"
                        ? t("settings:billingPage.intervalMonthly")
                        : t("settings:billingPage.intervalAnnual")}
                    </button>
                  ))}
                </div>
                {interval === "annual" ? (
                  <Badge variant="success" size="sm">
                    {t("settings:billingPage.twoMonthsFree")}
                  </Badge>
                ) : null}
              </div>
            </div>

            <div className="rounded-2xl border border-border/70 bg-card/70 p-2">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {PLANS.map((p) => {
                  const copy = planCopy[p.plan];
                  const price = PLAN_PRICES[p.plan][interval];
                  return (
                    <div
                      key={p.plan}
                      className={cn(
                        "flex flex-col rounded-xl border p-6",
                        p.highlighted
                          ? "border-primary/40 bg-card shadow-[0_0_40px_-12px] shadow-primary/20"
                          : "border-border/70 bg-card",
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <h3 className="font-medium text-sm">{copy.name}</h3>
                        {p.highlighted ? (
                          <span className="rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 font-medium text-primary text-xs">
                            {t("settings:billingPage.mostPopular")}
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1 text-foreground/60 text-sm">
                        {copy.tagline}
                      </p>

                      <div className="mt-6 flex items-baseline gap-1.5">
                        <span className="font-medium text-4xl tracking-tight">
                          {price}
                        </span>
                        <span className="text-foreground/60 text-sm">
                          {copy.suffix}
                        </span>
                      </div>
                      <p className="mt-1.5 text-foreground/60 text-sm">
                        {copy.note}
                      </p>

                      <ul className="mt-8 flex-1 space-y-3 text-sm">
                        {copy.features.map((feature) => (
                          <li
                            key={feature}
                            className="flex items-start gap-2.5"
                          >
                            <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                            <span className="text-foreground/90">
                              {feature}
                            </span>
                          </li>
                        ))}
                      </ul>

                      <Button
                        variant={p.highlighted ? "default" : "outline"}
                        className="mt-8 w-full"
                        disabled={!canManage || checkout.isPending}
                        onClick={() =>
                          checkout.mutate({ plan: p.plan, interval })
                        }
                      >
                        {checkout.isPending
                          ? t("settings:billingPage.starting")
                          : t("settings:billingPage.chooseButton", {
                              name: copy.name,
                            })}
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>

            <p className="text-muted-foreground text-xs">
              {canManage
                ? t("settings:billingPage.checkoutNote")
                : t("settings:billingPage.checkoutAdminOnly")}
            </p>
          </div>
        ) : null}
      </div>
    </>
  );
}
