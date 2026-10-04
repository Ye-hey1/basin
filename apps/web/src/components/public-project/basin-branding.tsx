import { useTranslation } from "react-i18next";

export function BasinBranding() {
  const { t } = useTranslation();

  return (
    <a
      href="https://basin.app"
      target="_blank"
      rel="noopener noreferrer"
      className="hover:text-foreground transition-colors"
    >
      {t("publicProject:branding.poweredBy")}{" "}
      <span className="font-medium">{t("common:appName")}</span>
    </a>
  );
}
