import { client } from "@basin/libs";
import { HttpError } from "@/lib/http-error";

async function reorderProjects(
  workspaceId: string,
  projects: Array<{ id: string; position: number }>,
) {
  const response = await client.project.reorder.$put({
    query: { workspaceId },
    json: { projects },
  });

  if (!response.ok) {
    throw await HttpError.fromResponse(response, "Request failed");
  }

  return response.json();
}

export default reorderProjects;
