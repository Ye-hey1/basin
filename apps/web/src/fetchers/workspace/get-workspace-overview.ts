import { client } from "@kaneo/libs";
import { HttpError } from "@/lib/http-error";

export type WorkspaceOverview = {
  totals: {
    total: number;
    completed: number;
    overdue: number;
    dueSoon: number;
  };
  projects: {
    projectId: string;
    name: string;
    total: number;
    completed: number;
  }[];
  assignees: {
    assigneeId: string;
    name: string;
    open: number;
  }[];
};

async function getWorkspaceOverview(workspaceId: string) {
  const response = await client.workspace[":workspaceId"].overview.$get({
    param: { workspaceId },
  });

  if (!response.ok) {
    throw await HttpError.fromResponse(response, "Failed to fetch overview");
  }

  const json = await response.json();

  return json as WorkspaceOverview;
}

export default getWorkspaceOverview;
