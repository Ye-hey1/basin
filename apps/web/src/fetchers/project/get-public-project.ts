import { client } from "@kaneo/libs";
import type { InferRequestType } from "hono/client";
import { HttpError } from "@/lib/http-error";

export type GetPublicProjectRequest = InferRequestType<
  (typeof client)["public-project"][":id"]["$get"]
>["param"];

async function getPublicProject({ id }: GetPublicProjectRequest) {
  const response = await client["public-project"][":id"].$get({
    param: { id },
  });

  if (!response.ok) {
    throw await HttpError.fromResponse(response, "Request failed");
  }

  const data = await response.json();

  return data;
}

export default getPublicProject;
