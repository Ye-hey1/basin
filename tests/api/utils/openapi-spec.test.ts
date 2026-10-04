import { describe, expect, it } from "vitest";
import { normalizeApiServerUrl } from "../../../apps/api/src/utils/openapi-spec";

describe("normalizeApiServerUrl", () => {
  it("appends /api when the base has no api suffix", () => {
    expect(normalizeApiServerUrl("https://cloud.basin.app")).toBe(
      "https://cloud.basin.app/api",
    );
  });

  it("leaves a URL that already ends with /api alone", () => {
    expect(normalizeApiServerUrl("https://cloud.basin.app/api")).toBe(
      "https://cloud.basin.app/api",
    );
  });

  it("strips trailing slashes before appending", () => {
    expect(normalizeApiServerUrl("https://cloud.basin.app///")).toBe(
      "https://cloud.basin.app/api",
    );
    expect(normalizeApiServerUrl("https://cloud.basin.app/api/")).toBe(
      "https://cloud.basin.app/api",
    );
  });
});
