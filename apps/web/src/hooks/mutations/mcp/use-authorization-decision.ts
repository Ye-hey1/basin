import { useMutation } from "@tanstack/react-query";
import { submitMcpAuthorizationDecision } from "@/fetchers/mcp/submit-authorization-decision";
import { translateApiError } from "@/lib/error-handler";
import { toast } from "@/lib/toast";

export function useMcpAuthorizationDecision() {
  return useMutation({
    mutationFn: ({
      requestId,
      approved,
    }: {
      requestId: string;
      approved: boolean;
    }) => submitMcpAuthorizationDecision(requestId, approved),
    onError: (error) => {
      toast.error(translateApiError(error) ?? error.message);
    },
  });
}
