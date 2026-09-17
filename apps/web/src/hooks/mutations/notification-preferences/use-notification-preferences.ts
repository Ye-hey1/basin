import { useMutation, useQueryClient } from "@tanstack/react-query";
import i18n from "i18next";
import deleteNotificationWorkspaceRule from "@/fetchers/notification-preferences/delete-notification-workspace-rule";
import updateNotificationPreferences, {
  type UpdateNotificationPreferencesRequest,
} from "@/fetchers/notification-preferences/update-notification-preferences";
import upsertNotificationWorkspaceRule, {
  type UpsertNotificationWorkspaceRuleRequest,
} from "@/fetchers/notification-preferences/upsert-notification-workspace-rule";
import { translateApiError } from "@/lib/error-handler";
import { toast } from "@/lib/toast";

function translatedError(error: unknown, fallbackKey: string): string {
  return (
    translateApiError(error) ??
    (error instanceof Error ? error.message : i18n.t(fallbackKey))
  );
}

export function useUpdateNotificationPreferences() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (json: UpdateNotificationPreferencesRequest) =>
      updateNotificationPreferences(json),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["notification-preferences"],
      });
      toast.success(i18n.t("settings:notificationsPage.toastPreferencesSaved"));
    },
    onError: (error) => {
      toast.error(
        translatedError(
          error,
          "settings:notificationsPage.toastPreferencesSaveFailed",
        ),
      );
    },
  });
}

export function useUpsertNotificationWorkspaceRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      workspaceId,
      json,
    }: {
      workspaceId: string;
      json: UpsertNotificationWorkspaceRuleRequest;
    }) => upsertNotificationWorkspaceRule(workspaceId, json),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["notification-preferences"],
      });
      toast.success(i18n.t("settings:notificationsPage.toastRuleSavedGeneric"));
    },
    onError: (error) => {
      toast.error(
        translatedError(
          error,
          "settings:notificationsPage.toastRuleSaveFailed",
        ),
      );
    },
  });
}

export function useDeleteNotificationWorkspaceRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (workspaceId: string) =>
      deleteNotificationWorkspaceRule(workspaceId),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["notification-preferences"],
      });
      toast.success(
        i18n.t("settings:notificationsPage.toastRuleRemovedGeneric"),
      );
    },
    onError: (error) => {
      toast.error(
        translatedError(
          error,
          "settings:notificationsPage.toastRuleRemoveFailed",
        ),
      );
    },
  });
}
