import { client } from "@basin/libs";
import { HttpError } from "@/lib/http-error";

async function exportTasks(projectId: string) {
  const response = await client.task.export[":projectId"].$get({
    param: { projectId },
  });

  if (!response.ok) {
    throw await HttpError.fromResponse(response, "Request failed");
  }

  const data = await response.json();
  return data;
}

export default exportTasks;
