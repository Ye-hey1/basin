import { client } from "@basin/libs";
import type { InferRequestType } from "hono";
import { HttpError } from "@/lib/http-error";

export type ImportGithubIssuesRequest = InferRequestType<
  (typeof client)["github-integration"]["import-issues"]["$post"]
>["json"];

async function importGithubIssues(data: ImportGithubIssuesRequest) {
  const response = await client["github-integration"]["import-issues"].$post({
    json: data,
  });

  if (!response.ok) {
    throw await HttpError.fromResponse(response, "Request failed");
  }

  const result = await response.json();
  return result;
}

export default importGithubIssues;
