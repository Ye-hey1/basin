import { client } from "@basin/libs";
import type { InferRequestType } from "hono/client";
import { HttpError } from "@/lib/http-error";

export type DeleteCommentRequest = InferRequestType<
  (typeof client)["activity"]["comment"]["$delete"]
>["json"];

async function deleteComment({ activityId }: DeleteCommentRequest) {
  const response = await client.activity.comment.$delete({
    json: { activityId },
  });

  if (!response.ok) {
    throw await HttpError.fromResponse(response, "Request failed");
  }

  const data = await response.json();

  return data;
}

export default deleteComment;
