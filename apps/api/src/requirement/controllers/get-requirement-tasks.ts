import { asc, desc, eq, sql } from "drizzle-orm";
import db, { schema } from "../../database";
import { loadOr404 } from "./get-requirement";

/**
 * Tasks linked to one requirement, across every project in the workspace.
 *
 * This deliberately does not reuse the project-scoped task list: a requirement
 * spans projects, so filtering that route by requirement id would only ever
 * return the tasks of whichever project the caller happened to name.
 */
async function getRequirementTasks(requirementId: string) {
  await loadOr404(requirementId);

  return db
    .select({
      id: schema.taskTable.id,
      title: schema.taskTable.title,
      number: schema.taskTable.number,
      status: schema.taskTable.status,
      priority: schema.taskTable.priority,
      projectId: schema.taskTable.projectId,
      projectName: schema.projectTable.name,
      assigneeName: schema.userTable.name,
      dueDate: schema.taskTable.dueDate,
      // Tasks in a virtual status (`planned`, `archived`) have no column, so
      // they are reported as not final rather than dropped.
      isFinal: sql<boolean>`coalesce(${schema.columnTable.isFinal}, false)`,
      createdAt: schema.taskTable.createdAt,
    })
    .from(schema.taskTable)
    .innerJoin(
      schema.projectTable,
      eq(schema.taskTable.projectId, schema.projectTable.id),
    )
    .leftJoin(
      schema.columnTable,
      eq(schema.taskTable.columnId, schema.columnTable.id),
    )
    .leftJoin(
      schema.userTable,
      eq(schema.taskTable.userId, schema.userTable.id),
    )
    .where(eq(schema.taskTable.requirementId, requirementId))
    .orderBy(asc(schema.taskTable.position), desc(schema.taskTable.createdAt));
}

export default getRequirementTasks;
