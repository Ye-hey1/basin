import { createHash } from "node:crypto";
import {
  type AiCitation,
  type BrainSourceType,
  chunkMarkdown,
  embedTexts,
  estimateTokens,
  type RagSource,
  toVectorLiteral,
} from "@basin/ai";
import { and, eq, sql } from "drizzle-orm";
import db, { schema } from "../database";
import { getAiRuntimeConfig } from "./config";

export type BrainSource = {
  workspaceId: string;
  projectId: string | null;
  title: string;
  content: string;
};

export type IndexJobPayload = {
  sourceType: BrainSourceType;
  sourceId: string;
};

function contentHash(content: string) {
  return createHash("sha256").update(content).digest("hex");
}

async function loadTaskSource(sourceId: string): Promise<BrainSource | null> {
  const [row] = await db
    .select({
      title: schema.taskTable.title,
      description: schema.taskTable.description,
      status: schema.taskTable.status,
      priority: schema.taskTable.priority,
      dueDate: schema.taskTable.dueDate,
      projectId: schema.taskTable.projectId,
      workspaceId: schema.projectTable.workspaceId,
    })
    .from(schema.taskTable)
    .innerJoin(
      schema.projectTable,
      eq(schema.taskTable.projectId, schema.projectTable.id),
    )
    .where(eq(schema.taskTable.id, sourceId))
    .limit(1);

  if (!row) {
    return null;
  }

  const meta = [
    `- status: ${row.status}`,
    `- priority: ${row.priority}`,
    row.dueDate ? `- due: ${row.dueDate.toISOString().slice(0, 10)}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  return {
    workspaceId: row.workspaceId,
    projectId: row.projectId,
    title: `Task: ${row.title}`,
    content: `# ${row.title}\n\n${meta}\n\n## Description\n\n${row.description || ""}`,
  };
}

// Task comments live in the activity table as rows with type "comment".
async function loadCommentSource(
  sourceId: string,
): Promise<BrainSource | null> {
  const [row] = await db
    .select({
      content: schema.activityTable.content,
      createdAt: schema.activityTable.createdAt,
      taskTitle: schema.taskTable.title,
      taskId: schema.taskTable.id,
      projectId: schema.taskTable.projectId,
      workspaceId: schema.projectTable.workspaceId,
    })
    .from(schema.activityTable)
    .innerJoin(
      schema.taskTable,
      eq(schema.activityTable.taskId, schema.taskTable.id),
    )
    .innerJoin(
      schema.projectTable,
      eq(schema.taskTable.projectId, schema.projectTable.id),
    )
    .where(
      and(
        eq(schema.activityTable.id, sourceId),
        eq(schema.activityTable.type, "comment"),
      ),
    )
    .limit(1);

  if (!row) {
    return null;
  }

  return {
    workspaceId: row.workspaceId,
    projectId: row.projectId,
    title: `Comment on "${row.taskTitle}"`,
    content: `# Comment on "${row.taskTitle}"\n\n${row.createdAt.toISOString().slice(0, 16).replace("T", " ")}\n\n${row.content}`,
  };
}

async function loadRequirementSource(
  sourceId: string,
): Promise<BrainSource | null> {
  const [row] = await db
    .select()
    .from(schema.requirementTable)
    .where(eq(schema.requirementTable.id, sourceId))
    .limit(1);

  if (!row) {
    return null;
  }

  const meta = [
    `- status: ${row.status}`,
    `- priority: ${row.priority}`,
    `- type: ${row.type}`,
    row.module ? `- module: ${row.module}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  return {
    workspaceId: row.workspaceId,
    projectId: null,
    title: `Requirement: ${row.title}`,
    content: `# ${row.title}\n\n${meta}\n\n## Description\n\n${row.description || ""}`,
  };
}

async function loadRequirementDocumentSource(
  sourceId: string,
): Promise<BrainSource | null> {
  const [row] = await db
    .select({
      title: schema.requirementDocumentTable.title,
      workspaceId: schema.requirementTable.workspaceId,
      content: sql<string>`(
        SELECT ${schema.requirementDocumentVersionTable.content}
        FROM ${schema.requirementDocumentVersionTable}
        WHERE ${schema.requirementDocumentVersionTable.documentId} = ${schema.requirementDocumentTable.id}
        ORDER BY ${schema.requirementDocumentVersionTable.version} DESC
        LIMIT 1
      )`,
    })
    .from(schema.requirementDocumentTable)
    .innerJoin(
      schema.requirementTable,
      eq(
        schema.requirementDocumentTable.requirementId,
        schema.requirementTable.id,
      ),
    )
    .where(eq(schema.requirementDocumentTable.id, sourceId))
    .limit(1);

  if (!row?.content) {
    return null;
  }

  return {
    workspaceId: row.workspaceId,
    projectId: null,
    title: `Document: ${row.title}`,
    content: `# ${row.title}\n\n${row.content}`,
  };
}

async function loadBrainSource(
  sourceType: BrainSourceType,
  sourceId: string,
): Promise<BrainSource | null> {
  switch (sourceType) {
    case "task":
      return loadTaskSource(sourceId);
    case "comment":
      return loadCommentSource(sourceId);
    case "requirement":
      return loadRequirementSource(sourceId);
    case "requirement_document":
      return loadRequirementDocumentSource(sourceId);
  }
}

export async function deleteBrainDocument(
  sourceType: string,
  sourceId: string,
) {
  await db
    .delete(schema.brainDocumentTable)
    .where(
      and(
        eq(schema.brainDocumentTable.sourceType, sourceType),
        eq(schema.brainDocumentTable.sourceId, sourceId),
      ),
    );
}

/**
 * Idempotent upsert of one workspace item into the Brain. Re-indexing an
 * unchanged source is a single hash read; a changed source replaces the
 * document row and all chunks. Safe to run concurrently (the unique
 * (source_type, source_id) constraint turns races into updates).
 */
export async function indexSource(
  payload: IndexJobPayload,
  // Injectable for tests; production always uses the real embedder.
  deps: { embedTexts?: typeof embedTexts } = {},
) {
  const embed = deps.embedTexts ?? embedTexts;
  const config = await getAiRuntimeConfig();
  if (!config) {
    throw new Error(
      "AI provider is not configured; cannot index Brain content (save a provider config or set AI_PROVIDER env vars)",
    );
  }

  const source = await loadBrainSource(payload.sourceType, payload.sourceId);
  if (!source) {
    await deleteBrainDocument(payload.sourceType, payload.sourceId);
    return { status: "deleted" as const };
  }

  const hash = contentHash(source.content);

  const [existing] = await db
    .select({
      id: schema.brainDocumentTable.id,
      contentHash: schema.brainDocumentTable.contentHash,
      indexedAt: schema.brainDocumentTable.indexedAt,
    })
    .from(schema.brainDocumentTable)
    .where(
      and(
        eq(schema.brainDocumentTable.sourceType, payload.sourceType),
        eq(schema.brainDocumentTable.sourceId, payload.sourceId),
      ),
    )
    .limit(1);

  if (existing && existing.contentHash === hash && existing.indexedAt) {
    return { status: "unchanged" as const, documentId: existing.id };
  }

  const documentValues = {
    sourceType: payload.sourceType,
    sourceId: payload.sourceId,
    workspaceId: source.workspaceId,
    projectId: source.projectId,
    title: source.title,
    content: source.content,
    contentHash: hash,
    indexedAt: null,
  };

  const [document] = await db
    .insert(schema.brainDocumentTable)
    .values(documentValues)
    .onConflictDoUpdate({
      target: [
        schema.brainDocumentTable.sourceType,
        schema.brainDocumentTable.sourceId,
      ],
      set: {
        workspaceId: documentValues.workspaceId,
        projectId: documentValues.projectId,
        title: documentValues.title,
        content: documentValues.content,
        contentHash: documentValues.contentHash,
        indexedAt: null,
      },
    })
    .returning({ id: schema.brainDocumentTable.id });

  if (!document) {
    throw new Error("Failed to upsert Brain document");
  }

  await db
    .delete(schema.brainChunkTable)
    .where(eq(schema.brainChunkTable.documentId, document.id));

  const pieces = chunkMarkdown(source.content);
  if (pieces.length === 0) {
    await db
      .update(schema.brainDocumentTable)
      .set({ indexedAt: new Date() })
      .where(eq(schema.brainDocumentTable.id, document.id));
    return { status: "indexed" as const, documentId: document.id, chunks: 0 };
  }

  const { vectors, dimensions } = await embed(config, pieces);

  await db.insert(schema.brainChunkTable).values(
    pieces.map((content, index) => ({
      documentId: document.id,
      workspaceId: source.workspaceId,
      projectId: source.projectId,
      chunkIndex: index,
      content,
      tokenCount: estimateTokens(content),
      embedding: vectors[index] ?? null,
      embeddingDimensions: vectors[index] ? dimensions : null,
    })),
  );

  await db
    .update(schema.brainDocumentTable)
    .set({ indexedAt: new Date() })
    .where(eq(schema.brainDocumentTable.id, document.id));

  return {
    status: "indexed" as const,
    documentId: document.id,
    chunks: pieces.length,
  };
}

export async function runIndexJob(payload: IndexJobPayload) {
  try {
    const result = await indexSource(payload);
    console.log(
      `[ai] indexed ${payload.sourceType}:${payload.sourceId} -> ${result.status}`,
    );
    return result;
  } catch (error) {
    console.error(
      `[ai] index job failed for ${payload.sourceType}:${payload.sourceId}:`,
      error,
    );
    throw error;
  }
}

const VECTOR_CANDIDATE_LIMIT = 20;
const KEYWORD_CANDIDATE_LIMIT = 5;
const CONTEXT_LIMIT = 12;

function escapeLike(value: string) {
  return value.replace(/([%_\\])/g, "\\$1");
}

function buildSnippet(content: string, needle: string) {
  const trimmed = content.trim();
  if (trimmed.length <= 320) {
    return trimmed;
  }
  const at = needle ? trimmed.toLowerCase().indexOf(needle.toLowerCase()) : -1;
  if (at < 0) {
    return `${trimmed.slice(0, 320)}…`;
  }
  const start = Math.max(0, at - 120);
  return `${start > 0 ? "…" : ""}${trimmed.slice(start, start + 320)}…`;
}

// Hybrid retrieval: dense vector search as the primary signal, plus a plain
// ILIKE pass so exact identifiers and short CJK queries that embed poorly are
// still found. Results merge with reciprocal-rank fusion. Every row is
// workspace-scoped, so retrieval can never leak across the workspace
// boundary; project-level access does not exist in basin's permission model.
export async function retrieveBrainContext(
  options: {
    workspaceId: string;
    query: string;
  },
  // Injectable for tests; production always uses the real embedder.
  deps: { embedTexts?: typeof embedTexts } = {},
) {
  const embed = deps.embedTexts ?? embedTexts;
  const config = await getAiRuntimeConfig();
  if (!config) {
    return [];
  }

  const { vectors, dimensions } = await embed(config, [options.query]);
  const queryVector = vectors[0];
  const query = options.query.trim();
  if (!queryVector) {
    return [];
  }

  const vectorRows = await db.execute<{
    chunk_id: string;
    content: string;
    title: string;
    source_type: string;
    source_id: string;
    project_id: string | null;
    distance: number;
  }>(sql`
    SELECT c.id AS chunk_id,
           c.content,
           d.title,
           d.source_type,
           d.source_id,
           d.project_id,
           (c.embedding <=> ${toVectorLiteral(queryVector)}::vector) AS distance
    FROM brain_chunk c
    JOIN brain_document d ON d.id = c.document_id
    WHERE c.workspace_id = ${options.workspaceId}
      AND c.embedding IS NOT NULL
      AND c.embedding_dimensions = ${dimensions}
    ORDER BY distance ASC
    LIMIT ${VECTOR_CANDIDATE_LIMIT}
  `);

  type KeywordRow = {
    chunk_id: string;
    content: string;
    title: string;
    source_type: string;
    source_id: string;
    project_id: string | null;
  };
  let keywordRows: { rows: KeywordRow[] } = { rows: [] };
  if (query.length >= 2) {
    keywordRows = await db.execute<KeywordRow>(sql`
      SELECT c.id AS chunk_id,
             c.content,
             d.title,
             d.source_type,
             d.source_id,
             d.project_id
      FROM brain_chunk c
      JOIN brain_document d ON d.id = c.document_id
      WHERE c.workspace_id = ${options.workspaceId}
        AND c.content ILIKE ${`%${escapeLike(query)}%`}
      LIMIT ${KEYWORD_CANDIDATE_LIMIT}
    `);
  }

  const fused = new Map<string, RagSource & { content: string }>();
  const addRow = (
    row: {
      chunk_id: string;
      content: string;
      title: string;
      source_type: string;
      source_id: string;
      project_id: string | null;
    },
    rank: number,
    weight: number,
  ) => {
    const score = weight / (60 + rank);
    const existing = fused.get(row.chunk_id);
    if (existing) {
      existing.score += score;
      return;
    }
    fused.set(row.chunk_id, {
      sourceType: row.source_type as BrainSourceType,
      sourceId: row.source_id,
      title: row.title,
      snippet: buildSnippet(row.content, query),
      content: row.content,
      score,
      projectId: row.project_id,
    });
  };

  for (const [index, row] of vectorRows.rows.entries()) {
    addRow(row, index, 1);
  }
  for (const [index, row] of keywordRows.rows.entries()) {
    addRow(row, index, 0.8);
  }

  return [...fused.values()]
    .sort((a, b) => b.score - a.score)
    .slice(0, CONTEXT_LIMIT)
    .map(({ content, ...citation }) => ({ ...citation, content }));
}

export function toCitations(sources: RagSource[]): AiCitation[] {
  return sources.map(({ content: _content, ...citation }) => citation);
}
