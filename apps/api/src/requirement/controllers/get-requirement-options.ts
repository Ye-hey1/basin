import { eq } from "drizzle-orm";
import db, { schema } from "../../database";

type OptionRow = {
  id: string;
  title: string;
  parentId: string | null;
  position: number | null;
};

/**
 * Flat, depth-annotated list for the parent picker. It deliberately returns
 * every workspace requirement rather than the caller's filtered view: a picker
 * that only offered currently-matching parents would make reparenting
 * impossible.
 */
async function getRequirementOptions(
  workspaceId: string,
  excludeId: string | undefined,
) {
  const rows = await db
    .select({
      id: schema.requirementTable.id,
      title: schema.requirementTable.title,
      parentId: schema.requirementTable.parentId,
      position: schema.requirementTable.position,
    })
    .from(schema.requirementTable)
    .where(eq(schema.requirementTable.workspaceId, workspaceId))
    .orderBy(
      schema.requirementTable.position,
      schema.requirementTable.createdAt,
    );

  const nodes: OptionRow[] = rows;

  // A requirement must never be offered as its own ancestor, so the excluded
  // node and its whole subtree are dropped from the picker.
  const hidden = new Set<string>();
  if (excludeId) {
    hidden.add(excludeId);
    let grew = true;
    while (grew) {
      grew = false;
      for (const node of nodes) {
        if (
          node.parentId &&
          hidden.has(node.parentId) &&
          !hidden.has(node.id)
        ) {
          hidden.add(node.id);
          grew = true;
        }
      }
    }
  }

  const depthOf = (node: OptionRow): number => {
    let depth = 0;
    let cursor = node.parentId;
    const visited = new Set<string>([node.id]);
    while (cursor && !visited.has(cursor)) {
      visited.add(cursor);
      depth += 1;
      const parent = nodes.find((candidate) => candidate.id === cursor);
      cursor = parent?.parentId ?? null;
    }
    return depth;
  };

  return nodes
    .filter((node) => !hidden.has(node.id))
    .map((node) => ({
      id: node.id,
      title: node.title,
      parentId: node.parentId,
      depth: depthOf(node),
    }));
}

export default getRequirementOptions;
