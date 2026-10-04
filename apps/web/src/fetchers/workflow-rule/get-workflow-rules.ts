import { client } from "@basin/libs";
import { HttpError } from "@/lib/http-error";

async function getWorkflowRules(projectId: string) {
  const response = await client["workflow-rule"][":projectId"].$get({
    param: { projectId },
  });

  if (!response.ok) {
    throw await HttpError.fromResponse(response, "Request failed");
  }

  return response.json();
}

export default getWorkflowRules;
