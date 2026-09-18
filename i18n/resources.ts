export const supportedLocales = ["en-US", "zh-CN"] as const;

export type AppLocale = (typeof supportedLocales)[number];

export const defaultLocale: AppLocale = "en-US";

export function isSupportedLocale(locale: string): locale is AppLocale {
  return (supportedLocales as readonly string[]).includes(locale);
}

export async function loadLocale(locale: AppLocale): Promise<object> {
  switch (locale) {
    case "en-US":
      return (await import("./en-US.json")).default;
    case "zh-CN":
      return (await import("./zh-CN.json")).default;
  }
}
