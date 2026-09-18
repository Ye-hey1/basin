import enUS from "../../../../i18n/en-US.json";
import zhCN from "../../../../i18n/zh-CN.json";

const messages = {
  en: enUS.invitations.email,
  zh: zhCN.invitations.email,
} as const;

export function getWorkspaceInvitationEmailCopy(locale?: string | null) {
  const normalizedLocale = locale?.toLowerCase();

  if (normalizedLocale?.startsWith("zh")) return messages.zh;

  return messages.en;
}
