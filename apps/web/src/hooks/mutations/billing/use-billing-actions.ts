import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  type BillingInterval,
  type BillingPlan,
  createBillingCheckout,
  createBillingPortal,
} from "@/fetchers/billing/create-checkout";
import { translateApiError } from "@/lib/error-handler";

export function useCreateCheckout(workspaceId: string | undefined) {
  const { t } = useTranslation();
  return useMutation({
    mutationFn: (input: { plan: BillingPlan; interval: BillingInterval }) =>
      createBillingCheckout({ workspaceId: workspaceId as string, ...input }),
    onSuccess: ({ checkoutUrl }) => {
      window.location.href = checkoutUrl;
    },
    onError: (error) => {
      toast.error(
        translateApiError(error) ??
          (error instanceof Error
            ? error.message
            : t("settings:billingPage.toastCheckoutFailed")),
      );
    },
  });
}

export function useOpenBillingPortal(workspaceId: string | undefined) {
  const { t } = useTranslation();
  return useMutation({
    mutationFn: () => createBillingPortal(workspaceId as string),
    onSuccess: ({ portalUrl }) => {
      window.location.href = portalUrl;
    },
    onError: (error) => {
      toast.error(
        translateApiError(error) ??
          (error instanceof Error
            ? error.message
            : t("settings:billingPage.toastPortalFailed")),
      );
    },
  });
}
