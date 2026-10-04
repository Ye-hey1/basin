import { client } from "@basin/libs";
import { HttpError } from "@/lib/http-error";

async function deleteGiteaIntegration(projectId: string) {
  const response = await client["gitea-integration"].project[
    ":projectId"
  ].$delete({
    param: { projectId },
  });

  if (!response.ok) {
    throw await HttpError.fromResponse(response, "Request failed");
  }

  return response.json();
}

export default deleteGiteaIntegration;
