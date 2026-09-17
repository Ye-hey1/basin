import { and, eq, sql } from "drizzle-orm";
import db, { schema } from "../../database";
import type { z } from "../../openapi";
import { httpError } from "../../utils/http-error";
import { mapAcceptanceItem } from "../mappers";
import type {
  createAcceptanceItemBody,
  updateAcceptanceItemBody,
} from "../schema";
import { loadOr404 } from "./get-requirement";

type CreateAcceptanceItemInput = z.infer<typeof createAcceptanceItemBody>;
type UpdateAcceptanceItemInput = z.infer<typeof updateAcceptanceItemBody>;

const acceptanceColumns = {
  id: schema.acceptanceItemTable.id,
  requirementId: schema.acceptanceItemTable.requirementId,
  title: schema.acceptanceItemTable.title,
  criterion: schema.acceptanceItemTable.criterion,
  status: schema.acceptanceItemTable.status,
  note: schema.acceptanceItemTable.note,
  verifiedBy: schema.acceptanceItemTable.verifiedBy,
  verifiedAt: schema.acceptanceItemTable.verifiedAt,
  position: schema.acceptanceItemTable.position,
  createdAt: schema.acceptanceItemTable.createdAt,
  updatedAt: schema.acceptanceItemTable.updatedAt,
  verifiedByName: schema.userTable.name,
};

function acceptanceQuery() {
  return db
    .select(acceptanceColumns)
    .from(schema.acceptanceItemTable)
    .leftJoin(
      schema.userTable,
      eq(schema.acceptanceItemTable.verifiedBy, schema.userTable.id),
    );
}

export async function listAcceptanceItems(requirementId: string) {
  const rows = await acceptanceQuery()
    .where(eq(schema.acceptanceItemTable.requirementId, requirementId))
    .orderBy(schema.acceptanceItemTable.position);

  return rows.map(mapAcceptanceItem);
}

export async function createAcceptanceItem(
  requirementId: string,
  input: CreateAcceptanceItemInput,
) {
  await loadOr404(requirementId);

  const [next] = await db
    .select({
      position: sql<number>`coalesce(max(${schema.acceptanceItemTable.position}), -1) + 1`,
    })
    .from(schema.acceptanceItemTable)
    .where(eq(schema.acceptanceItemTable.requirementId, requirementId));

  const [inserted] = await db
    .insert(schema.acceptanceItemTable)
    .values({
      requirementId,
      title: input.title.trim(),
      criterion: input.criterion ?? null,
      position: input.position ?? next?.position ?? 0,
    })
    .returning({ id: schema.acceptanceItemTable.id });

  if (!inserted) {
    throw httpError(
      500,
      "failed_to_create_acceptance_item",
      "Failed to create acceptance item",
    );
  }

  return loadAcceptanceItem(inserted.id);
}

/**
 * Updates a criterion. Verifying (passing or failing) stamps who signed off and
 * when; moving back to `pending` clears that stamp so an approval can't linger
 * on an item that is no longer verified.
 */
export async function updateAcceptanceItem(
  itemId: string,
  input: UpdateAcceptanceItemInput,
  userId: string,
) {
  await loadAcceptanceItem(itemId);

  const patch: Partial<typeof schema.acceptanceItemTable.$inferInsert> = {};

  if (input.title !== undefined) {
    patch.title = input.title.trim();
  }
  if (input.criterion !== undefined) {
    patch.criterion = input.criterion;
  }
  if (input.note !== undefined) {
    patch.note = input.note;
  }
  if (input.position !== undefined) {
    patch.position = input.position;
  }
  if (input.status !== undefined) {
    patch.status = input.status;
    if (input.status === "pending") {
      patch.verifiedBy = null;
      patch.verifiedAt = null;
    } else {
      patch.verifiedBy = userId;
      patch.verifiedAt = new Date();
    }
  }

  if (Object.keys(patch).length > 0) {
    await db
      .update(schema.acceptanceItemTable)
      .set(patch)
      .where(eq(schema.acceptanceItemTable.id, itemId));
  }

  return loadAcceptanceItem(itemId);
}

export async function deleteAcceptanceItem(itemId: string) {
  await loadAcceptanceItem(itemId);

  await db
    .delete(schema.acceptanceItemTable)
    .where(eq(schema.acceptanceItemTable.id, itemId));

  return { success: true };
}

async function loadAcceptanceItem(itemId: string) {
  const [row] = await acceptanceQuery()
    .where(eq(schema.acceptanceItemTable.id, itemId))
    .limit(1);

  if (!row) {
    throw httpError(
      404,
      "acceptance_item_not_found",
      "Acceptance item not found",
    );
  }

  return mapAcceptanceItem(row);
}

/** Bulk delete used by the requirement delete path when a node is removed. */
export async function deleteAcceptanceItemsForRequirement(
  requirementId: string,
) {
  await db
    .delete(schema.acceptanceItemTable)
    .where(and(eq(schema.acceptanceItemTable.requirementId, requirementId)));
}
