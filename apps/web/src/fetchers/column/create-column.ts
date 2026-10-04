import { client } from "@basin/libs";
import { HttpError } from "@/lib/http-error";

async function createColumn(
  projectId: string,
  data: { name: string; icon?: string; color?: string; isFinal?: boolean },
) {
  const response = await client.column[":projectId"].$post({
    param: { projectId },
    json: data,
  });

  if (!response.ok) {
    throw await HttpError.fromResponse(response, "Request failed");
  }

  return response.json();
}

export default createColumn;
