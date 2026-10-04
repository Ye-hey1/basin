import { describe, expect, it } from "vitest";
import { matchesCondition } from "../../../apps/api/src/agents/listeners";

describe("matchesCondition", () => {
  it("passes with no condition", () => {
    expect(matchesCondition(null, { any: "thing" })).toBe(true);
    expect(matchesCondition(undefined, {})).toBe(true);
  });

  it("matches scalar equality", () => {
    expect(
      matchesCondition({ newStatus: "blocked" }, { newStatus: "blocked" }),
    ).toBe(true);
    expect(
      matchesCondition({ newStatus: "blocked" }, { newStatus: "to-do" }),
    ).toBe(false);
  });

  it("matches array membership", () => {
    expect(
      matchesCondition(
        { newStatus: ["blocked", "in-progress"] },
        { newStatus: "blocked" },
      ),
    ).toBe(true);
    expect(
      matchesCondition({ newStatus: ["blocked"] }, { newStatus: "done" }),
    ).toBe(false);
  });

  it("requires every condition key to match", () => {
    expect(
      matchesCondition(
        { newStatus: "blocked", projectId: "p1" },
        { newStatus: "blocked", projectId: "p2" },
      ),
    ).toBe(false);
  });

  it("fails when the payload lacks the condition key", () => {
    expect(matchesCondition({ newStatus: "blocked" }, {})).toBe(false);
  });
});
