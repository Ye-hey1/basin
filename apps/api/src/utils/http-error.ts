import { HTTPException } from "hono/http-exception";
import type { ContentfulStatusCode } from "hono/utils/http-status";

// ApiError pairs the human-readable message with a stable machine-readable
// code, so clients can localize errors instead of matching English strings.
export class ApiError extends HTTPException {
  code: string;

  constructor(status: ContentfulStatusCode, code: string, message: string) {
    super(status, { message });
    this.code = code;
  }
}

export function httpError(
  status: ContentfulStatusCode,
  code: string,
  message: string,
): ApiError {
  return new ApiError(status, code, message);
}
