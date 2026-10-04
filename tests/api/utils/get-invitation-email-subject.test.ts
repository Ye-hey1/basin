import { describe, expect, it } from "vitest";
import { getInvitationEmailSubject } from "../../../apps/api/src/utils/get-invitation-email-subject";

describe("getInvitationEmailSubject", () => {
  it("uses Chinese copy for a regional Chinese locale", () => {
    const subject = getInvitationEmailSubject("zh-CN", "Alice", "产品团队");

    expect(subject).toBe("Alice 邀请你加入 Basin 上的 产品团队");
  });

  it("uses Chinese copy for a bare language tag", () => {
    const subject = getInvitationEmailSubject("zh", "Alice", "产品团队");

    expect(subject).toBe("Alice 邀请你加入 Basin 上的 产品团队");
  });

  it("uses English copy for an English locale", () => {
    const subject = getInvitationEmailSubject("en-US", "Alice", "Product");

    expect(subject).toBe("Alice invited you to join Product on Basin");
  });

  it("uses the English fallback for unsupported locales", () => {
    const subject = getInvitationEmailSubject("es-ES", "Alice", "Producto");

    expect(subject).toBe("Alice invited you to join Producto on Basin");
  });
});
