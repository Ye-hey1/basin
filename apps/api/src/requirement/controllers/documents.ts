import { and, desc, eq, inArray, sql } from "drizzle-orm";
import db, { schema } from "../../database";
import { publishEvent } from "../../events";
import type { z } from "../../openapi";
import { httpError } from "../../utils/http-error";
import {
  mapRequirementDocument,
  type RequirementDocumentRow,
} from "../mappers";
import type {
  createRequirementDocumentBody,
  updateRequirementDocumentBody,
} from "../schema";
import { loadOr404 } from "./get-requirement";

type CreateDocumentInput = z.infer<typeof createRequirementDocumentBody>;
type UpdateDocumentInput = z.infer<typeof updateRequirementDocumentBody>;

const documentColumns = {
  id: schema.requirementDocumentTable.id,
  requirementId: schema.requirementDocumentTable.requirementId,
  title: schema.requirementDocumentTable.title,
  position: schema.requirementDocumentTable.position,
  createdBy: schema.requirementDocumentTable.createdBy,
  createdAt: schema.requirementDocumentTable.createdAt,
  updatedAt: schema.requirementDocumentTable.updatedAt,
  // A document has no content column, so "current" is an aggregate over its
  // history. Both counts come back in the same grouped query the list already
  // needs, which is what keeps a requirement with many documents cheap to open.
  currentVersion: sql<
    number | null
  >`max(${schema.requirementDocumentVersionTable.version})::int`,
  versionCount: sql<number>`count(${schema.requirementDocumentVersionTable.id})::int`,
};

type DocumentRow = Omit<RequirementDocumentRow, "createdByName">;

function documentsQuery() {
  return db
    .select(documentColumns)
    .from(schema.requirementDocumentTable)
    .leftJoin(
      schema.requirementDocumentVersionTable,
      eq(
        schema.requirementDocumentVersionTable.documentId,
        schema.requirementDocumentTable.id,
      ),
    )
    .groupBy(schema.requirementDocumentTable.id);
}

/**
 * Resolves creator names for a page of rows in one query rather than one per
 * row, mirroring how requirement assignees are resolved.
 */
async function creatorNames(ids: Array<string | null>) {
  const unique = [
    ...new Set(ids.filter((id): id is string => typeof id === "string")),
  ];

  if (unique.length === 0) {
    return new Map<string, string>();
  }

  const rows = await db
    .select({ id: schema.userTable.id, name: schema.userTable.name })
    .from(schema.userTable)
    .where(inArray(schema.userTable.id, unique));

  return new Map(rows.map((row) => [row.id, row.name]));
}

async function attachCreatorNames(rows: DocumentRow[]) {
  const names = await creatorNames(rows.map((row) => row.createdBy));

  return rows.map((row) =>
    mapRequirementDocument({
      ...row,
      createdByName: row.createdBy ? (names.get(row.createdBy) ?? null) : null,
    }),
  );
}

async function loadDocumentOr404(documentId: string) {
  const [row] = await documentsQuery()
    .where(eq(schema.requirementDocumentTable.id, documentId))
    .limit(1);

  const [document] = row ? await attachCreatorNames([row]) : [];

  if (!document) {
    throw httpError(
      404,
      "requirement_document_not_found",
      "Requirement document not found",
    );
  }

  return document;
}

async function loadCurrentVersion(documentId: string) {
  const [row] = await db
    .select({
      version: schema.requirementDocumentVersionTable.version,
      content: schema.requirementDocumentVersionTable.content,
      createdBy: schema.requirementDocumentVersionTable.createdBy,
      createdAt: schema.requirementDocumentVersionTable.createdAt,
    })
    .from(schema.requirementDocumentVersionTable)
    .where(eq(schema.requirementDocumentVersionTable.documentId, documentId))
    .orderBy(desc(schema.requirementDocumentVersionTable.version))
    .limit(1);

  return row ?? null;
}

async function loadVersionSummaries(documentId: string) {
  const rows = await db
    .select({
      version: schema.requirementDocumentVersionTable.version,
      createdBy: schema.requirementDocumentVersionTable.createdBy,
      createdAt: schema.requirementDocumentVersionTable.createdAt,
    })
    .from(schema.requirementDocumentVersionTable)
    .where(eq(schema.requirementDocumentVersionTable.documentId, documentId))
    .orderBy(desc(schema.requirementDocumentVersionTable.version));

  const names = await creatorNames(rows.map((row) => row.createdBy));

  return rows.map((row) => ({
    ...row,
    createdByName: row.createdBy ? (names.get(row.createdBy) ?? null) : null,
  }));
}

/**
 * A document and its history. The content is the current version — the highest
 * one — so an editor never has to reconcile a separate copy of the text.
 */
export async function getRequirementDocument(documentId: string) {
  const document = await loadDocumentOr404(documentId);

  const [current, versions] = await Promise.all([
    loadCurrentVersion(documentId),
    loadVersionSummaries(documentId),
  ]);

  return {
    ...document,
    content: current?.content ?? "",
    versions,
  };
}

export async function listRequirementDocuments(requirementId: string) {
  await loadOr404(requirementId);

  const rows = await documentsQuery()
    .where(eq(schema.requirementDocumentTable.requirementId, requirementId))
    .orderBy(
      schema.requirementDocumentTable.position,
      schema.requirementDocumentTable.createdAt,
    );

  return attachCreatorNames(rows);
}

export async function createRequirementDocument(
  requirementId: string,
  input: CreateDocumentInput,
  userId: string,
) {
  await loadOr404(requirementId);

  const [last] = await db
    .select({
      position: sql<number>`coalesce(max(${schema.requirementDocumentTable.position}), -1) + 1`,
    })
    .from(schema.requirementDocumentTable)
    .where(eq(schema.requirementDocumentTable.requirementId, requirementId));

  // Document and first version are written together. A document with no version
  // would have no text and no history, which is not a state the editor can
  // render, so it must never exist even briefly.
  const documentId = await db.transaction(async (tx) => {
    const [document] = await tx
      .insert(schema.requirementDocumentTable)
      .values({
        requirementId,
        title: input.title.trim(),
        position: input.position ?? last?.position ?? 0,
        createdBy: userId,
      })
      .returning({ id: schema.requirementDocumentTable.id });

    if (!document) {
      throw httpError(
        500,
        "failed_to_create_requirement_document",
        "Failed to create the requirement document",
      );
    }

    await tx.insert(schema.requirementDocumentVersionTable).values({
      documentId: document.id,
      version: 1,
      content: input.content ?? "",
      createdBy: userId,
    });

    return document.id;
  });

  await publishEvent("requirement_document.saved", { documentId });

  return getRequirementDocument(documentId);
}

export async function updateRequirementDocument(
  documentId: string,
  input: UpdateDocumentInput,
) {
  await loadDocumentOr404(documentId);

  const patch: Partial<typeof schema.requirementDocumentTable.$inferInsert> =
    {};

  if (input.title !== undefined) {
    patch.title = input.title.trim();
  }
  if (input.position !== undefined) {
    patch.position = input.position;
  }

  if (Object.keys(patch).length > 0) {
    await db
      .update(schema.requirementDocumentTable)
      .set(patch)
      .where(eq(schema.requirementDocumentTable.id, documentId));
  }

  return getRequirementDocument(documentId);
}

/**
 * Saves the body as a new version.
 *
 * A save that changes nothing stores nothing: history is only useful while every
 * entry in it marks a real change, and a list of identical revisions hides the
 * one edit that mattered. Restoring an old version therefore goes through this
 * same path and is recorded as a new version rather than by rewriting history.
 *
 * The version number is read and written inside one transaction, so the unique
 * constraint on (document, version) turns a concurrent double-save into a
 * failure rather than two rows claiming the same version.
 */
export async function saveRequirementDocumentContent(
  documentId: string,
  content: string,
  userId: string,
) {
  await loadDocumentOr404(documentId);

  const changed = await db.transaction(async (tx) => {
    const [current] = await tx
      .select({
        version: schema.requirementDocumentVersionTable.version,
        content: schema.requirementDocumentVersionTable.content,
      })
      .from(schema.requirementDocumentVersionTable)
      .where(eq(schema.requirementDocumentVersionTable.documentId, documentId))
      .orderBy(desc(schema.requirementDocumentVersionTable.version))
      .limit(1);

    if (current && current.content === content) {
      return false;
    }

    await tx.insert(schema.requirementDocumentVersionTable).values({
      documentId,
      version: (current?.version ?? 0) + 1,
      content,
      createdBy: userId,
    });

    // Versions are the only place the text lives, so without this the document
    // would still claim it was last touched when it was created or renamed.
    await tx
      .update(schema.requirementDocumentTable)
      .set({ updatedAt: new Date() })
      .where(eq(schema.requirementDocumentTable.id, documentId));

    return true;
  });

  if (changed) {
    await publishEvent("requirement_document.saved", { documentId });
  }

  return { document: await getRequirementDocument(documentId), changed };
}

export async function getRequirementDocumentVersion(
  documentId: string,
  version: number,
) {
  await loadDocumentOr404(documentId);

  const [row] = await db
    .select({
      documentId: schema.requirementDocumentVersionTable.documentId,
      version: schema.requirementDocumentVersionTable.version,
      content: schema.requirementDocumentVersionTable.content,
      createdBy: schema.requirementDocumentVersionTable.createdBy,
      createdAt: schema.requirementDocumentVersionTable.createdAt,
    })
    .from(schema.requirementDocumentVersionTable)
    .where(
      and(
        eq(schema.requirementDocumentVersionTable.documentId, documentId),
        eq(schema.requirementDocumentVersionTable.version, version),
      ),
    )
    .limit(1);

  if (!row) {
    throw httpError(
      404,
      "requirement_document_version_not_found",
      "Document version not found",
    );
  }

  const names = await creatorNames([row.createdBy]);

  return {
    ...row,
    createdByName: row.createdBy ? (names.get(row.createdBy) ?? null) : null,
  };
}

export async function deleteRequirementDocument(documentId: string) {
  await loadDocumentOr404(documentId);

  await db
    .delete(schema.requirementDocumentTable)
    .where(eq(schema.requirementDocumentTable.id, documentId));

  await publishEvent("requirement_document.deleted", { documentId });

  return { success: true };
}
