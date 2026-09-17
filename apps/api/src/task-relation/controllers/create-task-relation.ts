import { and, eq, or } from "drizzle-orm";
import db from "../../database";
import {
  projectTable,
  taskRelationTable,
  taskTable,
} from "../../database/schema";
import { publishEvent } from "../../events";
import { httpError } from "../../utils/http-error";

async function createTaskRelation({
  sourceTaskId,
  targetTaskId,
  relationType,
  userId,
  workspaceId,
}: {
  sourceTaskId: string;
  targetTaskId: string;
  relationType: string;
  userId: string;
  workspaceId: string;
}) {
  if (sourceTaskId === targetTaskId) {
    throw httpError(
      400,
      "cannot_create_a_relation_between_a_task_and_itself",
      "Cannot create a relation between a task and itself",
    );
  }

  const [sourceTask] = await db
    .select({
      id: taskTable.id,
      projectId: taskTable.projectId,
      workspaceId: projectTable.workspaceId,
    })
    .from(taskTable)
    .innerJoin(projectTable, eq(taskTable.projectId, projectTable.id))
    .where(
      and(
        eq(taskTable.id, sourceTaskId),
        eq(projectTable.workspaceId, workspaceId),
      ),
    )
    .limit(1);

  if (!sourceTask) {
    throw httpError(404, "source_task_not_found", "Source task not found");
  }

  const [targetTask] = await db
    .select({
      id: taskTable.id,
      projectId: taskTable.projectId,
      workspaceId: projectTable.workspaceId,
    })
    .from(taskTable)
    .innerJoin(projectTable, eq(taskTable.projectId, projectTable.id))
    .where(
      and(
        eq(taskTable.id, targetTaskId),
        eq(projectTable.workspaceId, workspaceId),
      ),
    )
    .limit(1);

  if (!targetTask) {
    throw httpError(404, "target_task_not_found", "Target task not found");
  }

  const existing = await db
    .select({ id: taskRelationTable.id })
    .from(taskRelationTable)
    .where(
      and(
        eq(taskRelationTable.relationType, relationType),
        or(
          and(
            eq(taskRelationTable.sourceTaskId, sourceTaskId),
            eq(taskRelationTable.targetTaskId, targetTaskId),
          ),
          and(
            eq(taskRelationTable.sourceTaskId, targetTaskId),
            eq(taskRelationTable.targetTaskId, sourceTaskId),
          ),
        ),
      ),
    )
    .limit(1);

  if (existing.length > 0) {
    throw httpError(
      409,
      "this_relation_already_exists",
      "This relation already exists",
    );
  }

  const [relation] = await db
    .insert(taskRelationTable)
    .values({
      sourceTaskId,
      targetTaskId,
      relationType,
    })
    .returning();

  if (!relation) {
    throw httpError(
      500,
      "failed_to_create_task_relation",
      "Failed to create task relation",
    );
  }

  await publishEvent("task-relation.created", {
    ...relation,
    taskId: sourceTaskId,
    projectId: sourceTask.projectId,
    userId,
  });

  return relation;
}

export default createTaskRelation;
