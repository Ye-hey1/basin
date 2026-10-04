import { render } from "@react-email/render";
import { createElement } from "react";
import { describe, expect, it } from "vitest";
import PasswordResetEmail from "./password-reset";

describe("PasswordResetEmail", () => {
  it("renders Chinese copy for a Chinese locale", async () => {
    const html = await render(
      createElement(PasswordResetEmail, {
        resetLink: "https://basin.example/reset",
        locale: "zh-CN",
      }),
    );
    expect(html).toContain("重置密码");
    expect(html).toContain("Basin 安全邮件");
  });
});
