import { client } from "@kaneo/libs";
import { HttpError } from "@/lib/http-error";
import type Task from "@/types/task";

async function updateTaskRequirement(
  taskId: string,
  requirementId: string | null,
) {
  const response = await client.task.requirement[":id"].$put({
    param: { id: taskId },
    json: { requirementId },
  });

  if (!response.ok) {
    throw await HttpError.fromResponse(response, "Request failed");
  }

  return (await response.json()) as Task;
}

export default updateTaskRequirement;
