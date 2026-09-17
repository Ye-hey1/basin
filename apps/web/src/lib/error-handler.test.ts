import { describe, expect, it } from "vitest";
import { parseApiError, translateApiError } from "./error-handler";
import { HttpError } from "./http-error";

describe("parseApiError", () => {
  it("returns a generic message key for unknown Error instances instead of leaking error.message", () => {
    const internalMessage =
      "Cannot read properties of undefined (reading 'id') at TaskList";
    const result = parseApiError(new Error(internalMessage));

    expect(result.type).toBe("unknown");
    expect(result.message).toBe("common:error.messages.unknown");
    expect(result.message).not.toContain(internalMessage);
    // originalError is preserved so Sentry still sees the real cause.
    expect(result.originalError?.message).toBe(internalMessage);
  });

  it("returns a generic message key for non-Error values", () => {
    const result = parseApiError("something bad happened");
    expect(result.type).toBe("unknown");
    expect(result.message).toBe("common:error.messages.unknown");
  });

  it("still returns a CORS-specific message key for matching errors", () => {
    const result = parseApiError(new Error("Failed to fetch: CORS blocked"));
    expect(result.type).toBe("cors");
    expect(result.message).toBe("common:error.messages.cors");
  });

  it("classifies Safari's 'Load failed' as a network error, not CORS", () => {
    const originalMessage = "TypeError: Load failed";
    const error = new Error(originalMessage);

    const result = parseApiError(error);

    expect(result.type).toBe("network");
    expect(result.message).toBe("common:error.messages.network");
    expect(result.originalError).toBe(error);
    expect(result.originalError?.message).toBe(originalMessage);
  });
});

describe("translateApiError", () => {
  it("returns null for errors without an API code", () => {
    expect(translateApiError(new Error("plain failure"))).toBeNull();
    expect(translateApiError("some string")).toBeNull();
    expect(translateApiError(undefined)).toBeNull();
  });

  it("translates coded HttpErrors and falls back to the API message", () => {
    const error = new HttpError(404, "Task not found", "task_not_found");
    const result = translateApiError(error);

    // The i18n resources may not be loaded in unit tests; either the
    // translation or the raw message is acceptable, never the key itself.
    expect(result).toBeTruthy();
    expect(result).not.toContain("error.codes");
  });

  it("reads a code from plain objects with a code field", () => {
    const result = translateApiError({
      message: "Boom",
      code: "insufficient_permissions",
    });
    expect(result).toBeTruthy();
  });
});

describe("HttpError.fromResponse", () => {
  it("extracts message and code from an API error body", async () => {
    const response = new Response(
      JSON.stringify({ message: "Task not found", code: "task_not_found" }),
      { status: 404 },
    );

    const error = await HttpError.fromResponse(response, "Request failed");

    expect(error).toBeInstanceOf(HttpError);
    expect(error.status).toBe(404);
    expect(error.message).toBe("Task not found");
    expect(error.code).toBe("task_not_found");
  });

  it("falls back when the body is not JSON", async () => {
    const response = new Response("upstream error", { status: 502 });

    const error = await HttpError.fromResponse(response, "Request failed");

    expect(error.status).toBe(502);
    expect(error.message).toBe("Request failed");
    expect(error.code).toBeUndefined();
  });
});
