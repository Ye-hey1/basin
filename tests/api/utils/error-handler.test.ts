import type { Context } from "hono";
import { HTTPException } from "hono/http-exception";
import { describe, expect, it } from "vitest";
import { errorHandler } from "../../../apps/api/src/utils/error-handler";
import { httpError } from "../../../apps/api/src/utils/http-error";

// Stands in for Hono's Context: only the JSON reply is exercised here.
function stubContext() {
  return {
    json: (body: unknown, status: number) => Response.json(body, { status }),
  } as unknown as Context;
}

async function run(err: Error) {
  const response = errorHandler(err, stubContext());
  const body = (await response.json()) as { message: string; code?: string };

  return { response, body };
}

describe("errorHandler", () => {
  it("serializes an ApiError with its code", async () => {
    const { response, body } = await run(
      httpError(404, "task_not_found", "Task not found"),
    );

    expect(response.status).toBe(404);
    expect(body).toEqual({ message: "Task not found", code: "task_not_found" });
  });

  it("serializes a 5xx ApiError with its code", async () => {
    const { response, body } = await run(
      httpError(503, "service_unavailable", "Unavailable"),
    );

    expect(response.status).toBe(503);
    expect(body).toEqual({
      message: "Unavailable",
      code: "service_unavailable",
    });
  });

  // Regression: a bare HTTPException used to answer text/plain, contradicting
  // the application/json ApiError response that openapi.json declares.
  it("serializes a bare HTTPException as JSON instead of plain text", async () => {
    const { response, body } = await run(
      new HTTPException(400, { message: "Invalid config" }),
    );

    expect(response.status).toBe(400);
    expect(response.headers.get("content-type")).toContain("application/json");
    expect(body).toEqual({ message: "Invalid config" });
  });

  // The MCP OAuth endpoints speak the RFC 6749 error shape, so an exception
  // carrying its own Response has to win over the envelope.
  it("keeps an HTTPException that carries its own Response", async () => {
    const response = errorHandler(
      new HTTPException(400, {
        res: Response.json({ error: "invalid_client" }, { status: 400 }),
      }),
      stubContext(),
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "invalid_client" });
  });

  it("hides an unhandled failure behind a generic 500", async () => {
    const { response, body } = await run(new Error("database is on fire"));

    expect(response.status).toBe(500);
    expect(body).toEqual({ message: "Internal Server Error" });
  });
});
