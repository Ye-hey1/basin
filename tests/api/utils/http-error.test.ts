import { HTTPException } from "hono/http-exception";
import { describe, expect, it } from "vitest";
import { ApiError, httpError } from "../../../apps/api/src/utils/http-error";

describe("ApiError", () => {
  it("is an HTTPException carrying a stable code", () => {
    const error = httpError(404, "task_not_found", "Task not found");

    expect(error).toBeInstanceOf(HTTPException);
    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(404);
    expect(error.message).toBe("Task not found");
    expect(error.code).toBe("task_not_found");
  });
});
