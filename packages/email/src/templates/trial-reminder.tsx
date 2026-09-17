import { Link, Section, Text } from "@react-email/components";
import React from "react";
import { resolveEmailLocale } from "./resolve-locale";
import { EmailShell, styles } from "./shell";

void React;

export type TrialReminderEmailProps = {
  workspaceName: string;
  daysLeft: number;
  billingUrl: string;
  locale?: string | null;
};

const messages = {
  en: {
    title: (workspaceName: string, daysLeft: number) => {
      if (daysLeft <= 0) {
        return `The trial for ${workspaceName} has ended`;
      }
      if (daysLeft === 1) {
        return `1 day left on your ${workspaceName} trial`;
      }
      return `${daysLeft} days left on your ${workspaceName} trial`;
    },
    subtitle: (daysLeft: number) => {
      if (daysLeft <= 0) {
        return "Your workspace is read-only until you choose a plan. Nothing has been deleted, and your data is still there.";
      }
      return "Choose a plan to keep creating and editing when the trial ends.";
    },
    cta: "Choose a plan",
    body: "Kaneo is also free forever if you host it yourself, with every feature included. You can export your data at any time and move it to your own server.",
    footer:
      "You are receiving this because you own this workspace on Kaneo Cloud.",
  },
  zh: {
    title: (workspaceName: string, daysLeft: number) => {
      if (daysLeft <= 0) {
        return `${workspaceName} 的试用期已结束`;
      }
      if (daysLeft === 1) {
        return `你的 ${workspaceName} 试用期还剩 1 天`;
      }
      return `你的 ${workspaceName} 试用期还剩 ${daysLeft} 天`;
    },
    subtitle: (daysLeft: number) => {
      if (daysLeft <= 0) {
        return "在你选择套餐之前，工作区为只读状态。没有任何内容被删除，你的数据仍然保留。";
      }
      return "选择一个套餐，以便在试用结束后继续创建和编辑。";
    },
    cta: "选择套餐",
    body: "如果你自己托管 Kaneo，同样可以永久免费使用全部功能。你可以随时导出数据并迁移到自己的服务器。",
    footer: "你收到这封邮件，是因为你是 Kaneo Cloud 上此工作区的所有者。",
  },
} as const;

const TrialReminderEmail = ({
  workspaceName,
  daysLeft,
  billingUrl,
  locale,
}: TrialReminderEmailProps) => {
  // Only en and zh wording exists for this template; every other locale
  // falls back to English rather than a partial mix.
  const copy = resolveEmailLocale(locale) === "zh" ? messages.zh : messages.en;

  return (
    <EmailShell
      preview={copy.title(workspaceName, daysLeft)}
      title={copy.title(workspaceName, daysLeft)}
      subtitle={copy.subtitle(daysLeft)}
    >
      <Section>
        <Link style={styles.button} href={billingUrl}>
          {copy.cta}
        </Link>
        <Text style={styles.paragraph}>{copy.body}</Text>
        <Section style={styles.divider} />
        <Text style={styles.footer}>{copy.footer}</Text>
      </Section>
    </EmailShell>
  );
};

export default TrialReminderEmail;
