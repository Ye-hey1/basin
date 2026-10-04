import { render } from "@react-email/render";
import { createElement } from "react";
import { describe, expect, it } from "vitest";
import NotificationEmail from "./notification";

describe("NotificationEmail", () => {
  it("renders Chinese chrome for a Chinese locale", async () => {
    const html = await render(
      createElement(NotificationEmail, {
        title: "任务已分配给你",
        message: "请查看设计稿。",
        actionUrl: "https://basin.example/task/1",
        locale: "zh-CN",
      }),
    );
    expect(html).toContain("有一条通知符合你的投递偏好。");
    expect(html).toContain("在 Basin 中打开");
  });
});
