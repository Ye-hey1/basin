import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import db, { schema } from "../../apps/api/src/database";
import { createApp } from "../../apps/api/src/index";
import { mockAuthenticatedSession } from "./helpers/auth";
import { resetTestDatabase } from "./helpers/database";
import { createWorkspaceMember } from "./helpers/fixtures";

type App = ReturnType<typeof createApp>["app"];

type DocumentDetail = {
  id: string;
  requirementId: string;
  title: string;
  position: number | null;
  currentVersion: number | null;
  versionCount: number;
  createdByName: string | null;
  content: string;
  versions: Array<{ version: number; createdByName: string | null }>;
};

function json(body: Record<string, unknown>) {
  return {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  } as const;
}

async function createRequirement(app: App, workspaceId: string) {
  const response = await app.request(
    "/api/requirement",
    json({ workspaceId, title: "Requirement with documents" }),
  );
  expect(response.status).toBe(200);
  return (await response.json()) as { id: string };
}

async function createDocument(
  app: App,
  requirementId: string,
  body: Record<string, unknown> = {},
) {
  const response = await app.request(
    `/api/requirement/${requirementId}/documents`,
    {
      ...json({ title: "PRD", ...body }),
    },
  );
  expect(response.status).toBe(200);
  return (await response.json()) as DocumentDetail;
}

async function saveContent(app: App, documentId: string, content: string) {
  const response = await app.request(
    `/api/requirement/documents/${documentId}/content`,
    {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ content }),
    },
  );
  expect(response.status).toBe(200);
  return (await response.json()) as {
    document: DocumentDetail;
    changed: boolean;
  };
}

describe("API integration: requirement documents", () => {
  beforeEach(async () => {
    await resetTestDatabase();
  });

  it("creates a document with the supplied Markdown as version 1", async () => {
    const member = await createWorkspaceMember();
    mockAuthenticatedSession(member.user);
    const { app } = createApp();

    const requirement = await createRequirement(app, member.workspace.id);
    const document = await createDocument(app, requirement.id, {
      content: "# Scope\n\nThe first cut.",
    });

    expect(document.requirementId).toBe(requirement.id);
    expect(document.currentVersion).toBe(1);
    expect(document.versionCount).toBe(1);
    expect(document.content).toBe("# Scope\n\nThe first cut.");
    expect(document.createdByName).toBe(member.user.name);
    expect(document.versions.map((v) => v.version)).toEqual([1]);
  });

  it("lists documents without loading their Markdown", async () => {
    const member = await createWorkspaceMember();
    mockAuthenticatedSession(member.user);
    const { app } = createApp();

    const requirement = await createRequirement(app, member.workspace.id);
    await createDocument(app, requirement.id, {
      title: "PRD",
      content: "one",
    });
    await createDocument(app, requirement.id, {
      title: "Integration notes",
      content: "two",
    });

    const response = await app.request(
      `/api/requirement/${requirement.id}/documents?workspaceId=${member.workspace.id}`,
    );
    expect(response.status).toBe(200);
    const list = (await response.json()) as Array<Record<string, unknown>>;

    expect(list.map((row) => row.title)).toEqual(["PRD", "Integration notes"]);
    expect(list[0]).not.toHaveProperty("content");
    expect(list[0].currentVersion).toBe(1);
  });

  it("stores a new version on every real edit and reads history back", async () => {
    const member = await createWorkspaceMember();
    mockAuthenticatedSession(member.user);
    const { app } = createApp();

    const requirement = await createRequirement(app, member.workspace.id);
    const document = await createDocument(app, requirement.id, {
      content: "v1 text",
    });

    const second = await saveContent(app, document.id, "v2 text");
    expect(second.changed).toBe(true);
    expect(second.document.currentVersion).toBe(2);
    expect(second.document.content).toBe("v2 text");

    const versionResponse = await app.request(
      `/api/requirement/documents/${document.id}/versions/1?workspaceId=${member.workspace.id}`,
    );
    expect(versionResponse.status).toBe(200);
    const version = (await versionResponse.json()) as { content: string };
    expect(version.content).toBe("v1 text");
  });

  // History is only worth keeping while every entry marks a real change, so a
  // save that changes nothing must not add a revision.
  it("stores nothing when the saved text matches the current version", async () => {
    const member = await createWorkspaceMember();
    mockAuthenticatedSession(member.user);
    const { app } = createApp();

    const requirement = await createRequirement(app, member.workspace.id);
    const document = await createDocument(app, requirement.id, {
      content: "unchanged",
    });

    const saved = await saveContent(app, document.id, "unchanged");

    expect(saved.changed).toBe(false);
    expect(saved.document.currentVersion).toBe(1);
    expect(saved.document.versionCount).toBe(1);
  });

  // Restoring is a normal save, so the old text comes back as a new version and
  // the intermediate one stays readable.
  it("restores an old version by saving it again", async () => {
    const member = await createWorkspaceMember();
    mockAuthenticatedSession(member.user);
    const { app } = createApp();

    const requirement = await createRequirement(app, member.workspace.id);
    const document = await createDocument(app, requirement.id, {
      content: "original",
    });
    await saveContent(app, document.id, "rewritten");

    const restored = await saveContent(app, document.id, "original");

    expect(restored.document.currentVersion).toBe(3);
    expect(restored.document.content).toBe("original");
    expect(
      restored.document.versions.map((version) => version.version),
    ).toEqual([3, 2, 1]);
  });

  it("renames a document without touching its versions", async () => {
    const member = await createWorkspaceMember();
    mockAuthenticatedSession(member.user);
    const { app } = createApp();

    const requirement = await createRequirement(app, member.workspace.id);
    const document = await createDocument(app, requirement.id, {
      title: "Draft",
      content: "body",
    });

    const response = await app.request(
      `/api/requirement/documents/${document.id}`,
      {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title: "Final PRD" }),
      },
    );

    expect(response.status).toBe(200);
    const renamed = (await response.json()) as DocumentDetail;
    expect(renamed.title).toBe("Final PRD");
    expect(renamed.currentVersion).toBe(1);
    expect(renamed.content).toBe("body");
  });

  it("deletes a document together with its history", async () => {
    const member = await createWorkspaceMember();
    mockAuthenticatedSession(member.user);
    const { app } = createApp();

    const requirement = await createRequirement(app, member.workspace.id);
    const document = await createDocument(app, requirement.id, {
      content: "first",
    });
    await saveContent(app, document.id, "second");

    const response = await app.request(
      `/api/requirement/documents/${document.id}?workspaceId=${member.workspace.id}`,
      { method: "DELETE" },
    );

    expect(response.status).toBe(200);

    const remainingVersions = await db
      .select()
      .from(schema.requirementDocumentVersionTable)
      .where(
        eq(schema.requirementDocumentVersionTable.documentId, document.id),
      );
    expect(remainingVersions).toHaveLength(0);

    const afterDelete = await app.request(
      `/api/requirement/documents/${document.id}?workspaceId=${member.workspace.id}`,
    );
    expect(afterDelete.status).toBe(404);
  });

  it("counts documents on the requirement itself", async () => {
    const member = await createWorkspaceMember();
    mockAuthenticatedSession(member.user);
    const { app } = createApp();

    const requirement = await createRequirement(app, member.workspace.id);
    await createDocument(app, requirement.id);

    const response = await app.request(
      `/api/requirement/${requirement.id}?workspaceId=${member.workspace.id}`,
    );
    expect(response.status).toBe(200);
    const detail = (await response.json()) as { documentCount: number };

    expect(detail.documentCount).toBe(1);
  });

  it("rejects a document route for an unknown requirement", async () => {
    const member = await createWorkspaceMember();
    mockAuthenticatedSession(member.user);
    const { app } = createApp();

    const response = await app.request(
      `/api/requirement/missing-requirement/documents?workspaceId=${member.workspace.id}`,
    );

    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.code).toBe("requirement_not_found");
  });

  // A document id from someone else's workspace resolves, and is then refused
  // rather than reported as missing.
  it("refuses a document that belongs to another workspace", async () => {
    const owner = await createWorkspaceMember();
    mockAuthenticatedSession(owner.user);
    const ownerApp = createApp().app;
    const ownerRequirement = await createRequirement(
      ownerApp,
      owner.workspace.id,
    );
    const document = await createDocument(ownerApp, ownerRequirement.id, {
      content: "secret",
    });

    const outsider = await createWorkspaceMember();
    mockAuthenticatedSession(outsider.user);
    const { app } = createApp();

    const response = await app.request(
      `/api/requirement/documents/${document.id}?workspaceId=${outsider.workspace.id}`,
    );

    expect(response.status).toBe(403);
  });

  it("returns 404 with the document code for an unknown document", async () => {
    const member = await createWorkspaceMember();
    mockAuthenticatedSession(member.user);
    const { app } = createApp();

    const response = await app.request(
      `/api/requirement/documents/missing-document?workspaceId=${member.workspace.id}`,
    );

    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.code).toBe("requirement_document_not_found");
  });
});
