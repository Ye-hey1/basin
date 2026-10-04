import { client } from "@basin/libs";
import { HttpError } from "@/lib/http-error";

async function uploadAvatar({
  contentType,
  data,
}: {
  contentType: string;
  data: string;
}) {
  const response = await client.user.avatar.$put({
    json: { contentType, data },
  });

  if (!response.ok) {
    throw await HttpError.fromResponse(response, "Request failed");
  }

  return response.json();
}

export default uploadAvatar;
