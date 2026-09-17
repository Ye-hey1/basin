import { client } from "@kaneo/libs";
import { HttpError } from "@/lib/http-error";

async function deleteTimeEntry(timeEntryId: string) {
  const response = await client["time-entry"][":id"].$delete({
    param: { id: timeEntryId },
  });

  if (!response.ok) {
    throw await HttpError.fromResponse(response, "Request failed");
  }

  const data = await response.json();

  return data;
}

export default deleteTimeEntry;
