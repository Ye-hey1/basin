import { createHash } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import db, { schema } from "../../apps/api/src/database";
import type { AiRuntimeConfig } from "../../packages/ai/src/index";
import { resetTestDatabase } from "./helpers/database";
import {
  createProjectFixture,
  createWorkspaceMember,
} from "./helpers/fixtures";

// The pipeline reads provider config from env when no DB row exists; the
// values never reach a network in this suite because the embedder is
// injected with a deterministic fake below.
process.env.AI_PROVIDER = "openai-compatible";
process.env.AI_BASE_URL = "http://localhost:9";
process.env.AI_API_KEY = "test-key";
process.env.AI_CHAT_MODEL = "test-chat";
process.env.AI_EMBEDDING_MODEL = "test-embedding";

const { indexSource, retrieveBrainContext } = await import(
  "../../apps/api/src/ai/pipeline"
);

// Deterministic pseudo-vectors derived from the text: stable across runs so
// re-index dedup and retrieval assertions hold.
const fakeEmbed = async (
  _config: AiRuntimeConfig,
  texts: string[],
): Promise<{ vectors: number[][]; dimensions: number }> => ({
  vectors: texts.map((text) => {
    const hash = createHash("sha256").update(text).digest();
    return Array.from({ length: 8 }, (_, index) => (hash[index] / 255) * 2 - 1);
  }),
  dimensions: 8,
});

const deps = { embedTexts: fakeEmbed };

async function seedTask(title: string, description: string) {
  const { workspace } = await createWorkspaceMember();
  const { project } = await createProjectFixture({ workspaceId: workspace.id });
  const [task] = await db
    .insert(schema.taskTable)
    .values({ projectId: project.id, title, description })
    .returning();
  return { workspace, project, task };
}

describe("Brain pipeline (integration)", () => {
  beforeEach(async () => {
    await resetTestDatabase();
  });

  it("indexes a task into chunks with vectors", async () => {
    const { workspace, task } = await seedTask(
      "Password reset flow",
      "The reset email link expires after 15 minutes and users are confused.",
    );

    const result = await indexSource(
      { sourceType: "task", sourceId: task.id },
      deps,
    );

    expect(result.status).toBe("indexed");
    expect(result.chunks).toBeGreaterThan(0);

    const [document] = await db
      .select()
      .from(schema.brainDocumentTable)
      .where(eqSource("task", task.id));
    expect(document.workspaceId).toBe(workspace.id);
    expect(document.title).toContain("Password reset flow");

    const chunks = await db
      .select()
      .from(schema.brainChunkTable)
      .where(eqDocument(document.id));
    expect(chunks.length).toBeGreaterThan(0);
    expect(chunks[0].embedding).not.toBeNull();
    expect(chunks[0].embeddingDimensions).toBe(8);
  });

  it("skips re-indexing when content is unchanged", async () => {
    const { task } = await seedTask("Stable task", "Same content.");
    await indexSource({ sourceType: "task", sourceId: task.id }, deps);
    const second = await indexSource(
      { sourceType: "task", sourceId: task.id },
      deps,
    );
    expect(second.status).toBe("unchanged");
  });

  it("retrieves indexed content for a workspace query", async () => {
    const { workspace, task } = await seedTask(
      "Billing webhook",
      "The creem webhook retries five times before giving up.",
    );
    await indexSource({ sourceType: "task", sourceId: task.id }, deps);

    const sources = await retrieveBrainContext(
      { workspaceId: workspace.id, query: "creem webhook" },
      deps,
    );

    expect(sources.length).toBeGreaterThan(0);
    expect(
      sources.some((source) => source.content.includes("creem webhook")),
    ).toBe(true);
    expect(sources[0].projectId).toBe(task.projectId);
    expect(sources[0].sourceType).toBe("task");
  });

  it("never returns chunks from another workspace", async () => {
    const { workspace, task } = await seedTask(
      "Secret token",
      "Internal rotation procedure for the deployment secret token.",
    );
    await indexSource({ sourceType: "task", sourceId: task.id }, deps);

    const other = await createWorkspaceMember({
      workspaceName: "Other Workspace",
    });

    const sources = await retrieveBrainContext(
      { workspaceId: other.workspace.id, query: "secret token" },
      deps,
    );

    expect(sources).toHaveLength(0);
    expect(workspace.id).not.toBe(other.workspace.id);
  });

  it("removes the Brain document when the source is deleted", async () => {
    const { task } = await seedTask("Doomed task", "Will be deleted.");
    await indexSource({ sourceType: "task", sourceId: task.id }, deps);

    await db.delete(schema.taskTable).where(eqTask(task.id));
    const result = await indexSource(
      { sourceType: "task", sourceId: task.id },
      deps,
    );

    expect(result.status).toBe("deleted");
    const [document] = await db
      .select()
      .from(schema.brainDocumentTable)
      .where(eqSource("task", task.id));
    expect(document).toBeUndefined();
  });
});

function eqSource(sourceType: string, sourceId: string) {
  return and(
    eq(schema.brainDocumentTable.sourceType, sourceType),
    eq(schema.brainDocumentTable.sourceId, sourceId),
  );
}

function eqDocument(documentId: string) {
  return eq(schema.brainChunkTable.documentId, documentId);
}

function eqTask(taskId: string) {
  return eq(schema.taskTable.id, taskId);
}
