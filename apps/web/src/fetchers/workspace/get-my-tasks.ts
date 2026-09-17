import { client } from "@kaneo/libs";
import { HttpError } from "@/lib/http-error";

export type MyTask = {
  id: string;
  projectId: string;
  projectName: string;
  position: number | null;
  number: number | null;
  userId: string | null;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  startDate: string | null;
  dueDate: string | null;
  createdAt: string;
};

async function getMyTasks(workspaceId: string) {
  const response = await client.workspace[":workspaceId"]["my-tasks"].$get({
    param: { workspaceId },
  });

  if (!response.ok) {
    throw await HttpError.fromResponse(response, "Failed to fetch my tasks");
  }

  const json = await response.json();

  return json as MyTask[];
}

export default getMyTasks;
