import { render } from "@react-email/render";
import { createElement } from "react";
import { describe, expect, it } from "vitest";
import MagicLinkEmail from "./magic-link";

describe("MagicLinkEmail", () => {
  it("renders Chinese copy for a Chinese locale", async () => {
    const html = await render(
      createElement(MagicLinkEmail, {
        magicLink: "https://kaneo.example/auth",
        locale: "zh-CN",
      }),
    );
    expect(html).toContain("登录 Kaneo");
    expect(html).toContain("Kaneo 安全邮件");
  });
});
