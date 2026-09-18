import { Link, Section, Text } from "@react-email/components";
import React from "react";
import { resolveEmailLocale } from "./resolve-locale";
import { EmailShell, styles } from "./shell";

void React;

export type PasswordResetEmailProps = {
  resetLink: string;
  userName?: string;
  locale?: string | null;
};

const messages = {
  en: {
    preview: "Reset your Kaneo password",
    title: "Reset your password",
    subtitleWithName: (name: string) =>
      `Hi ${name}, use the button below to set a new password.`,
    subtitleDefault: "Use the button below to set a new password.",
    cta: "Reset password",
    expiry: "This reset link expires in 1 hour.",
    ignore: "If you didn't request this, no changes will be made.",
    footer: "Kaneo security email",
  },
  zh: {
    preview: "重置你的 Kaneo 密码",
    title: "重置密码",
    subtitleWithName: (name: string) =>
      `你好 ${name}，点击下方按钮设置新密码。`,
    subtitleDefault: "点击下方按钮设置新密码。",
    cta: "重置密码",
    expiry: "此重置链接 1 小时后过期。",
    ignore: "如果你没有发起此请求，将不会做任何更改。",
    footer: "Kaneo 安全邮件",
  },
} as const;

const PasswordResetEmail = ({
  resetLink,
  userName,
  locale,
}: PasswordResetEmailProps) => {
  const copy = messages[resolveEmailLocale(locale)];

  return (
    <EmailShell
      preview={copy.preview}
      title={copy.title}
      subtitle={
        userName ? copy.subtitleWithName(userName) : copy.subtitleDefault
      }
    >
      <Section>
        <Link style={styles.button} href={resetLink}>
          {copy.cta}
        </Link>
        <Text style={styles.paragraph}>{copy.expiry}</Text>
        <Text style={styles.muted}>{copy.ignore}</Text>
        <Section style={styles.divider} />
        <Text style={styles.footer}>{copy.footer}</Text>
      </Section>
    </EmailShell>
  );
};

PasswordResetEmail.PreviewProps = {
  resetLink: "https://kaneo.app/auth/reset-password?token=example",
  userName: "Jane",
} as PasswordResetEmailProps;

export default PasswordResetEmail;
