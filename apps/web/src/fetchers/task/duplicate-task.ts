import { client } from "@basin/libs";
import { HttpError } from "@/lib/http-error";

async function duplicateTask(taskId: string) {
  const response = await client.task[":id"].duplicate.$post({
    param: { id: taskId },
  });

  if (!response.ok) {
    throw await HttpError.fromResponse(response, "Request failed");
  }

  const data = await response.json();

  return data;
}

export default duplicateTask;
