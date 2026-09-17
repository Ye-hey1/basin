import { client } from "@kaneo/libs";
import { HttpError } from "@/lib/http-error";
import type { AcceptanceItem, AcceptanceStatus } from "@/types/requirement";

export async function listAcceptanceItems(
  id: string,
  workspaceId: string,
): Promise<AcceptanceItem[]> {
  const response = await client.requirement[":id"]["acceptance-items"].$get({
    param: { id },
    query: { workspaceId },
  });

  if (!response.ok) {
    throw await HttpError.fromResponse(
      response,
      "Failed to fetch acceptance criteria",
    );
  }

  return (await response.json()) as AcceptanceItem[];
}

export async function createAcceptanceItem({
  id,
  workspaceId,
  title,
  criterion,
}: {
  id: string;
  workspaceId: string;
  title: string;
  criterion?: string | null;
}): Promise<AcceptanceItem> {
  const response = await client.requirement[":id"]["acceptance-items"].$post({
    param: { id },
    query: { workspaceId },
    json: { title, criterion: criterion ?? null },
  });

  if (!response.ok) {
    throw await HttpError.fromResponse(
      response,
      "Failed to add acceptance criterion",
    );
  }

  return (await response.json()) as AcceptanceItem;
}

export async function updateAcceptanceItem({
  itemId,
  workspaceId,
  ...input
}: {
  itemId: string;
  workspaceId: string;
  title?: string;
  criterion?: string | null;
  status?: AcceptanceStatus;
  note?: string | null;
  position?: number;
}): Promise<AcceptanceItem> {
  const response = await client.requirement["acceptance-items"][
    ":itemId"
  ].$patch({
    param: { itemId },
    query: { workspaceId },
    json: input,
  });

  if (!response.ok) {
    throw await HttpError.fromResponse(
      response,
      "Failed to update acceptance criterion",
    );
  }

  return (await response.json()) as AcceptanceItem;
}

export async function deleteAcceptanceItem(
  itemId: string,
  workspaceId: string,
): Promise<{ success: boolean }> {
  const response = await client.requirement["acceptance-items"][
    ":itemId"
  ].$delete({ param: { itemId }, query: { workspaceId } });

  if (!response.ok) {
    throw await HttpError.fromResponse(
      response,
      "Failed to delete acceptance criterion",
    );
  }

  return (await response.json()) as { success: boolean };
}
