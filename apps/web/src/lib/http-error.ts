export class HttpError extends Error {
  status: number;
  code?: string;

  constructor(status: number, message: string, code?: string) {
    super(message);
    this.name = "HttpError";
    this.status = status;
    this.code = code;
  }

  // Reads the API's { message, code } error body when present and falls back
  // to `fallbackMessage` for non-JSON or unexpected responses.
  static async fromResponse(
    response: Response,
    fallbackMessage: string,
  ): Promise<HttpError> {
    let message = fallbackMessage;
    let code: string | undefined;

    try {
      const body = await response.json();
      if (typeof body?.message === "string") {
        message = body.message;
      }
      if (typeof body?.code === "string") {
        code = body.code;
      }
    } catch {
      // Non-JSON error bodies keep the fallback message.
    }

    return new HttpError(response.status, message, code);
  }
}

export function isUnauthorizedError(error: unknown): boolean {
  return error instanceof HttpError && error.status === 401;
}

// Shared unauthorized redirect for both the React Query error cache and direct
// fetcher calls (e.g. route loaders) that bypass the QueryCache. Stashes the
// current pathname/search/hash so the sign-in page can return the user to
// where they were instead of dropping them on /dashboard.
export function handleUnauthorized(): void {
  const currentPath =
    window.location.pathname + window.location.search + window.location.hash;
  const target = currentPath
    ? `/auth/sign-in?redirect=${encodeURIComponent(currentPath)}`
    : "/auth/sign-in";
  window.location.replace(target);
}
