import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import db, { schema } from "../../apps/api/src/database";
import { createApp } from "../../apps/api/src/index";
import { mockAuthenticatedSession } from "./helpers/auth";
import { resetTestDatabase } from "./helpers/database";
import { createWorkspaceMember } from "./helpers/fixtures";

type App = ReturnType<typeof createApp>["app"];

async function postRequirement(
  app: App,
  body: Record<string, unknown>,
): Promise<Response> {
  return app.request("/api/requirement", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function createRequirement(
  app: App,
  workspaceId: string,
  overrides: Record<string, unknown> = {},
) {
  const response = await postRequirement(app, {
    workspaceId,
    title: "Requirement",
    ...overrides,
  });
  expect(response.status).toBe(200);
  return (await response.json()) as {
    id: string;
    status: string;
    priority: string;
    type: string;
    parentId: string | null;
  };
}

describe("API integration: requirements", () => {
  beforeEach(async () => {
    await resetTestDatabase();
  });

  it("creates a root requirement with the documented defaults", async () => {
    const member = await createWorkspaceMember({ role: "member" });
    mockAuthenticatedSession(member.user);
    const { app } = createApp();

    const created = await createRequirement(app, member.workspace.id, {
      title: "Ship the requirement module",
    });

    expect(created.parentId).toBeNull();
    expect(created.status).toBe("pending_review");
    expect(created.priority).toBe("P2");
    expect(created.type).toBe("feature");

    const persisted = await db.query.requirementTable.findFirst({
      where: eq(schema.requirementTable.id, created.id),
    });
    expect(persisted?.workspaceId).toBe(member.workspace.id);
    expect(persisted?.createdBy).toBe(member.user.id);
  });

  it("nests sub-requirements under their parent in the tree", async () => {
    const member = await createWorkspaceMember({ role: "member" });
    mockAuthenticatedSession(member.user);
    const { app } = createApp();

    const root = await createRequirement(app, member.workspace.id, {
      title: "Root",
    });

    const childResponse = await app.request(
      `/api/requirement/${root.id}/children`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ titles: ["Child A", "Child B"] }),
      },
    );
    expect(childResponse.status).toBe(200);

    const treeResponse = await app.request(
      `/api/requirement/tree?workspaceId=${member.workspace.id}`,
    );
    expect(treeResponse.status).toBe(200);

    const tree = (await treeResponse.json()) as Array<{
      id: string;
      title: string;
      children: Array<{ title: string }>;
    }>;

    expect(tree).toHaveLength(1);
    const [treeRoot] = tree;
    expect(treeRoot?.id).toBe(root.id);
    expect(treeRoot?.children.map((child) => child.title)).toEqual([
      "Child A",
      "Child B",
    ]);
  });

  it("refuses to delete a requirement that still has sub-requirements", async () => {
    // `delete` is an admin action and the permission check deliberately runs
    // before the business rule, so this needs a role that holds it.
    const member = await createWorkspaceMember({ role: "admin" });
    mockAuthenticatedSession(member.user);
    const { app } = createApp();

    const root = await createRequirement(app, member.workspace.id, {
      title: "Root",
    });
    await createRequirement(app, member.workspace.id, {
      title: "Child",
      parentId: root.id,
    });

    const response = await app.request(
      `/api/requirement/${root.id}?workspaceId=${member.workspace.id}`,
      { method: "DELETE" },
    );

    expect(response.status).toBe(409);

    const stillThere = await db.query.requirementTable.findFirst({
      where: eq(schema.requirementTable.id, root.id),
    });
    expect(stillThere).toBeDefined();
  });

  it("refuses to move a requirement under its own descendant", async () => {
    const member = await createWorkspaceMember({ role: "admin" });
    mockAuthenticatedSession(member.user);
    const { app } = createApp();

    const root = await createRequirement(app, member.workspace.id, {
      title: "Root",
    });
    const child = await createRequirement(app, member.workspace.id, {
      title: "Child",
      parentId: root.id,
    });
    const grandchild = await createRequirement(app, member.workspace.id, {
      title: "Grandchild",
      parentId: child.id,
    });

    const response = await app.request(`/api/requirement/${root.id}/move`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ targetId: grandchild.id }),
    });

    expect(response.status).toBe(400);

    const unchanged = await db.query.requirementTable.findFirst({
      where: eq(schema.requirementTable.id, root.id),
    });
    expect(unchanged?.parentId).toBeNull();
  });

  it("moves a requirement to the top level with a null target", async () => {
    const member = await createWorkspaceMember({ role: "admin" });
    mockAuthenticatedSession(member.user);
    const { app } = createApp();

    const root = await createRequirement(app, member.workspace.id, {
      title: "Root",
    });
    const child = await createRequirement(app, member.workspace.id, {
      title: "Child",
      parentId: root.id,
    });

    const response = await app.request(`/api/requirement/${child.id}/move`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ targetId: null }),
    });

    expect(response.status).toBe(200);

    const moved = await db.query.requirementTable.findFirst({
      where: eq(schema.requirementTable.id, child.id),
    });
    expect(moved?.parentId).toBeNull();
  });

  it("blocks a viewer from creating a requirement", async () => {
    const viewer = await createWorkspaceMember({ role: "viewer" });
    mockAuthenticatedSession(viewer.user);
    const { app } = createApp();

    const response = await postRequirement(app, {
      workspaceId: viewer.workspace.id,
      title: "Should not exist",
    });

    expect(response.status).toBe(403);

    const persisted = await db.query.requirementTable.findFirst({
      where: eq(schema.requirementTable.title, "Should not exist"),
    });
    expect(persisted).toBeUndefined();
  });

  it("rejects a parent that belongs to another workspace", async () => {
    const member = await createWorkspaceMember({ role: "admin" });
    const other = await createWorkspaceMember({ role: "admin" });

    mockAuthenticatedSession(member.user);
    const { app } = createApp();

    const foreign = await db
      .insert(schema.requirementTable)
      .values({
        workspaceId: other.workspace.id,
        title: "Foreign root",
      })
      .returning({ id: schema.requirementTable.id });

    const response = await postRequirement(app, {
      workspaceId: member.workspace.id,
      title: "Sneaky child",
      parentId: foreign[0]?.id,
    });

    expect(response.status).toBe(404);
  });

  it("stamps the verifying user when an acceptance criterion is passed", async () => {
    const member = await createWorkspaceMember({ role: "member" });
    mockAuthenticatedSession(member.user);
    const { app } = createApp();

    const requirement = await createRequirement(app, member.workspace.id, {
      title: "Verifiable",
    });

    const createdResponse = await app.request(
      `/api/requirement/${requirement.id}/acceptance-items`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title: "Loads in under 2s" }),
      },
    );
    expect(createdResponse.status).toBe(200);
    const item = (await createdResponse.json()) as {
      id: string;
      status: string;
    };
    expect(item.status).toBe("pending");

    const verifyResponse = await app.request(
      `/api/requirement/acceptance-items/${item.id}?workspaceId=${member.workspace.id}`,
      {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: "passed" }),
      },
    );
    expect(verifyResponse.status).toBe(200);

    const verified = (await verifyResponse.json()) as {
      status: string;
      verifiedBy: string | null;
      verifiedAt: string | null;
    };
    expect(verified.status).toBe("passed");
    expect(verified.verifiedBy).toBe(member.user.id);
    expect(verified.verifiedAt).not.toBeNull();
  });
});
