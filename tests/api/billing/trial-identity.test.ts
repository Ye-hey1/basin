import { describe, expect, it } from "vitest";
import {
  hashTrialEmail,
  normalizeTrialEmail,
} from "../../../apps/api/src/billing/trial-identity";

describe("normalizeTrialEmail", () => {
  it("lowercases and trims", () => {
    expect(normalizeTrialEmail("  Andrej@Basin.APP ")).toBe("andrej@basin.app");
  });

  it("drops plus tags so aliases share one trial", () => {
    expect(normalizeTrialEmail("andrej+trial2@basin.app")).toBe(
      "andrej@basin.app",
    );
  });

  it("keeps the address when stripping would empty the local part", () => {
    expect(normalizeTrialEmail("+tag@basin.app")).toBe("+tag@basin.app");
  });

  it("leaves values without an address shape alone", () => {
    expect(normalizeTrialEmail("not-an-email")).toBe("not-an-email");
  });
});

describe("hashTrialEmail", () => {
  it("matches for addresses that normalize to the same mailbox", () => {
    expect(hashTrialEmail("Andrej+one@basin.app")).toBe(
      hashTrialEmail("andrej@basin.app"),
    );
  });

  it("differs for different mailboxes", () => {
    expect(hashTrialEmail("a@basin.app")).not.toBe(
      hashTrialEmail("b@basin.app"),
    );
  });

  it("does not store the address itself", () => {
    expect(hashTrialEmail("andrej@basin.app")).not.toContain("basin");
  });
});
