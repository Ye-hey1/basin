import { describe, expect, it } from "vitest";
import { createApp } from "../../apps/api/src/index";

describe("API integration: health", () => {
  it("responds with ok on /api/health", async () => {
    const { app } = createApp();

    const response = await app.request("/api/health");

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ status: "ok" });
  });

  it("answers an unmatched path with the JSON error envelope", async () => {
    const { app } = createApp();

    // A path outside /api never reaches the auth guard, so it falls through to
    // the router's unmatched-path handler.
    const response = await app.request("/definitely-not-a-route");

    expect(response.status).toBe(404);
    expect(response.headers.get("content-type")).toContain("application/json");
    await expect(response.json()).resolves.toEqual({
      message: "Not Found",
      code: "not_found",
    });
  });
});
