import { HttpError } from "@/lib/http-error";
import { i18n } from "@/lib/i18n";

export type ApiError = {
  message: string;
  type: "network" | "cors" | "auth" | "server" | "unknown";
  status?: number;
  originalError?: Error;
};

// The API pairs most errors with a stable code in the response body; the web
// keeps an i18n key per code under common.error.codes. Returns the translated
// message when the error carries a code, falling back to the API's raw
// message for codes without a key yet.
export function translateApiError(error: unknown): string | null {
  const code =
    error instanceof HttpError
      ? error.code
      : error && typeof error === "object" && "code" in error
        ? String((error as { code: unknown }).code)
        : null;
  if (!code) {
    return null;
  }
  const fallback =
    error instanceof Error && error.message
      ? error.message
      : error && typeof error === "object" && "message" in error
        ? String((error as { message: unknown }).message)
        : "";
  return i18n.t(`common:error.codes.${code}`, { defaultValue: fallback });
}

export function parseApiError(error: unknown): ApiError {
  if (error instanceof Error) {
    if (
      error.message.includes("Failed to fetch") ||
      error.message.includes("NetworkError") ||
      error.message.includes("CORS")
    ) {
      return {
        message: "common:error.messages.cors",
        type: "cors",
        originalError: error,
      };
    }

    if (
      error.message.includes("Load failed") ||
      error.message.includes("fetch") ||
      error.message.includes("network") ||
      error.message.includes("connection")
    ) {
      return {
        message: "common:error.messages.network",
        type: "network",
        originalError: error,
      };
    }

    if (
      error.message.includes("401") ||
      error.message.includes("unauthorized") ||
      error.message.includes("authentication")
    ) {
      return {
        message: "common:error.messages.auth",
        type: "auth",
        status: 401,
        originalError: error,
      };
    }

    // Check for server errors
    if (
      error.message.includes("500") ||
      error.message.includes("server error") ||
      error.message.includes("internal")
    ) {
      return {
        message: "common:error.messages.server",
        type: "server",
        status: 500,
        originalError: error,
      };
    }

    // Don't surface `error.message` here: this branch covers both genuine
    // API unknowns and any non-API error passed in (e.g. a React render
    // error bubbled up to ErrorBoundary), and a raw `error.message` from
    // the latter can leak internal implementation details to end users.
    // The original error is preserved on `originalError` for Sentry.
    return {
      message: "common:error.messages.unknown",
      type: "unknown",
      originalError: error,
    };
  }

  return {
    message: "common:error.messages.unknown",
    type: "unknown",
  };
}

export function getCorsTroubleshootingSteps(): string[] {
  return [
    "common:error.troubleshootingSteps.cors.checkApiRunning",
    "common:error.troubleshootingSteps.cors.checkApiUrl",
    "common:error.troubleshootingSteps.cors.verifyCorsOrigins",
    "common:error.troubleshootingSteps.cors.checkProtocol",
    "common:error.troubleshootingSteps.cors.checkAccessibility",
  ];
}

export function getNetworkTroubleshootingSteps(): string[] {
  return [
    "common:error.troubleshootingSteps.network.checkConnection",
    "common:error.troubleshootingSteps.network.verifyApiRunning",
    "common:error.troubleshootingSteps.network.tryRefresh",
    "common:error.troubleshootingSteps.network.checkFirewall",
  ];
}
