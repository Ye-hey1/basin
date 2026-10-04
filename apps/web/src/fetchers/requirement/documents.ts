import { client } from "@basin/libs";
import { HttpError } from "@/lib/http-error";
import type {
  RequirementDocument,
  RequirementDocumentDetail,
  RequirementDocumentVersion,
} from "@/types/requirement";

export async function listRequirementDocuments(
  id: string,
  workspaceId: string,
): Promise<RequirementDocument[]> {
  const response = await client.requirement[":id"].documents.$get({
    param: { id },
    query: { workspaceId },
  });

  if (!response.ok) {
    throw await HttpError.fromResponse(
      response,
      "Failed to fetch requirement documents",
    );
  }

  return (await response.json()) as RequirementDocument[];
}

export async function createRequirementDocument({
  id,
  workspaceId,
  title,
  content,
}: {
  id: string;
  workspaceId: string;
  title: string;
  content?: string;
}): Promise<RequirementDocumentDetail> {
  const response = await client.requirement[":id"].documents.$post({
    param: { id },
    query: { workspaceId },
    json: { title, content },
  });

  if (!response.ok) {
    throw await HttpError.fromResponse(
      response,
      "Failed to create requirement document",
    );
  }

  return (await response.json()) as RequirementDocumentDetail;
}

export async function getRequirementDocument(
  documentId: string,
  workspaceId: string,
): Promise<RequirementDocumentDetail> {
  const response = await client.requirement.documents[":documentId"].$get({
    param: { documentId },
    query: { workspaceId },
  });

  if (!response.ok) {
    throw await HttpError.fromResponse(
      response,
      "Failed to fetch requirement document",
    );
  }

  return (await response.json()) as RequirementDocumentDetail;
}

export async function updateRequirementDocument({
  documentId,
  workspaceId,
  ...input
}: {
  documentId: string;
  workspaceId: string;
  title?: string;
  position?: number;
}): Promise<RequirementDocumentDetail> {
  const response = await client.requirement.documents[":documentId"].$patch({
    param: { documentId },
    query: { workspaceId },
    json: input,
  });

  if (!response.ok) {
    throw await HttpError.fromResponse(
      response,
      "Failed to update requirement document",
    );
  }

  return (await response.json()) as RequirementDocumentDetail;
}

/**
 * Saves the body as a new version. `changed` is false when the submitted text
 * matched the current version, in which case the server stored nothing.
 */
export async function saveRequirementDocumentContent({
  documentId,
  workspaceId,
  content,
}: {
  documentId: string;
  workspaceId: string;
  content: string;
}): Promise<{ document: RequirementDocumentDetail; changed: boolean }> {
  const response = await client.requirement.documents[
    ":documentId"
  ].content.$put({
    param: { documentId },
    query: { workspaceId },
    json: { content },
  });

  if (!response.ok) {
    throw await HttpError.fromResponse(
      response,
      "Failed to save requirement document",
    );
  }

  return (await response.json()) as {
    document: RequirementDocumentDetail;
    changed: boolean;
  };
}

export async function getRequirementDocumentVersion({
  documentId,
  workspaceId,
  version,
}: {
  documentId: string;
  workspaceId: string;
  version: number;
}): Promise<RequirementDocumentVersion> {
  const response = await client.requirement.documents[":documentId"].versions[
    ":version"
  ].$get({
    param: { documentId, version: String(version) },
    query: { workspaceId },
  });

  if (!response.ok) {
    throw await HttpError.fromResponse(
      response,
      "Failed to fetch the document version",
    );
  }

  return (await response.json()) as RequirementDocumentVersion;
}

export async function deleteRequirementDocument(
  documentId: string,
  workspaceId: string,
): Promise<{ success: boolean }> {
  const response = await client.requirement.documents[":documentId"].$delete({
    param: { documentId },
    query: { workspaceId },
  });

  if (!response.ok) {
    throw await HttpError.fromResponse(
      response,
      "Failed to delete requirement document",
    );
  }

  return (await response.json()) as { success: boolean };
}
