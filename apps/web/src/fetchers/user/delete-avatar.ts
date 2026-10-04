import { client } from "@basin/libs";
import { HttpError } from "@/lib/http-error";

async function deleteAvatar() {
  const response = await client.user.avatar.$delete();

  if (!response.ok) {
    throw await HttpError.fromResponse(response, "Request failed");
  }

  return response.json();
}

export default deleteAvatar;
