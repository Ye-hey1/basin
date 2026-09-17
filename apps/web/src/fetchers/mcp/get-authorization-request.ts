import { getApiUrl } from "@/fetchers/get-api-url";
import { HttpError } from "@/lib/http-error";

export type McpAuthorizationRequest = {
  clientName: string;
  redirectUri: string;
};

export async function getMcpAuthorizationRequest(
  requestId: string,
): Promise<McpAuthorizationRequest> {
  const response = await fetch(
    getApiUrl(`/mcp/authorize/request/${encodeURIComponent(requestId)}`),
    { credentials: "include" },
  );
  if (!response.ok) {
    throw await HttpError.fromResponse(
      response,
      "This authorization request is invalid or has expired.",
    );
  }

  const body = (await response.json()) as {
    client_name: string;
    redirect_uri: string;
  };
  return {
    clientName: body.client_name,
    redirectUri: body.redirect_uri,
  };
}
