import { describe, expect, it, vi } from "vitest";

vi.mock("@i18n/resources", async () => {
  const actual =
    await vi.importActual<typeof import("@i18n/resources")>("@i18n/resources");
  return {
    ...actual,
    loadLocale: vi.fn(async () => ({
      common: { testCommon: "common-value" },
      auth: { testAuth: "auth-value" },
    })),
  };
});

const { i18n, preloadNamespaces, resolveLocale } = await import("./index");
const resources = await import("@i18n/resources");

describe("preloadNamespaces", () => {
  it("loads every namespace so non-default keys resolve after async init", async () => {
    await preloadNamespaces("en-US");

    expect(i18n.t("auth:testAuth")).toBe("auth-value");
    expect(i18n.t("common:testCommon")).toBe("common-value");
  });

  it("reuses the cached locale JSON across calls", async () => {
    const callsBefore = (resources.loadLocale as ReturnType<typeof vi.fn>).mock
      .calls.length;

    await preloadNamespaces("en-US");

    expect(
      (resources.loadLocale as ReturnType<typeof vi.fn>).mock.calls.length,
    ).toBe(callsBefore);
  });
});

describe("resolveLocale", () => {
  it("matches a regional variant of a supported language", () => {
    expect(resolveLocale("zh-TW", null)).toBe("zh-CN");
  });

  it("falls back to the default locale for a language Kaneo dropped", () => {
    expect(resolveLocale("ja-JP", null)).toBe("en-US");
    expect(resolveLocale("de-DE", null)).toBe("en-US");
  });

  it("prefers the saved locale over the browser one", () => {
    expect(resolveLocale("en-US", "zh-CN")).toBe("en-US");
  });
});
