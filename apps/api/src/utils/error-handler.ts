import * as Sentry from "@sentry/node";
import type { Context } from "hono";
import { HTTPException } from "hono/http-exception";
import { ApiError } from "./http-error";

// Every error the API raises answers the JSON envelope documented as ApiError,
// so a client reads `code` instead of matching English prose. Hono's own
// HTTPException handler writes text/plain, which silently breaks that promise
// for any route that throws a bare HTTPException, so the only response allowed
// to bypass the envelope is one carrying an explicit replacement Response: the
// MCP OAuth endpoints, which speak the RFC 6749 { error, error_description }
// shape instead.
export function errorHandler(err: Error, c: Context) {
  if (err instanceof ApiError) {
    // expected errors (401/404/...) are not reported; real failures are
    if (err.status >= 500) {
      Sentry.captureException(err);
    }
    return c.json({ message: err.message, code: err.code }, err.status);
  }

  if (err instanceof HTTPException) {
    // expected errors (401/404/...) are not reported; real failures are
    if (err.status >= 500) {
      Sentry.captureException(err);
    }

    if (err.res) {
      return err.getResponse();
    }

    return c.json({ message: err.message }, err.status);
  }

  Sentry.captureException(err);
  return c.json({ message: "Internal Server Error" }, 500);
}
