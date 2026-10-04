import { render } from "@react-email/render";
import { createElement } from "react";
import { describe, expect, it } from "vitest";
import OtpEmail from "./otp";

describe("OtpEmail", () => {
  it("renders OTP and verification copy in HTML", async () => {
    const html = await render(createElement(OtpEmail, { otp: "123456" }));
    expect(html).toContain("123456");
    expect(html).toContain("verification code");
  });

  it("renders Chinese copy for a Chinese locale", async () => {
    const html = await render(
      createElement(OtpEmail, { otp: "123456", locale: "zh-CN" }),
    );
    expect(html).toContain("你的验证码");
    expect(html).toContain("Basin 安全邮件");
  });
});
