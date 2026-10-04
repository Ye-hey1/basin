import { client } from "@basin/libs";
import { HttpError } from "@/lib/http-error";

async function deleteRequirement(id: string, workspaceId: string) {
  const response = await client.requirement[":id"].$delete({
    param: { id },
    query: { workspaceId },
  });

  if (!response.ok) {
    throw await HttpError.fromResponse(
      response,
      "Failed to delete requirement",
    );
  }

  return (await response.json()) as { success: boolean; message: string };
}

export default deleteRequirement;
