import { eq, max } from "drizzle-orm";
import db from "../../database";
import {
  customFieldDefinitionTable,
  customFieldValueTable,
  projectTable,
  taskTable,
} from "../../database/schema";
import { httpError } from "../../utils/http-error";

async function createCustomField(
  projectId: string,
  name: string,
  type: string,
  required: boolean,
  defaultValue?: string,
  options?: string[],
) {
  const [project] = await db
    .select({ id: projectTable.id })
    .from(projectTable)
    .where(eq(projectTable.id, projectId))
    .limit(1);

  if (!project) {
    throw httpError(404, "project_not_found", "Project not found");
  }

  if (
    required &&
    (defaultValue === undefined ||
      defaultValue === null ||
      defaultValue.trim() === "")
  ) {
    throw httpError(
      400,
      "required_field_requires_default",
      "Required fields must have a default value",
    );
  }

  if (defaultValue !== undefined && defaultValue !== null) {
    const trimmedValue = defaultValue.trim();

    if (trimmedValue) {
      if (type === "number") {
        const numberRegex = /^-?\d+(?:\.\d+)?(?:e[+-]?\d+)?$/i;
        if (!numberRegex.test(trimmedValue)) {
          throw httpError(
            400,
            "invalid_default_value",
            "Default value must be a valid number for number type fields",
          );
        }
        const parsed = Number(trimmedValue);
        if (Number.isNaN(parsed) || !Number.isFinite(parsed)) {
          throw httpError(
            400,
            "invalid_default_value",
            "Default value must be a valid number for number type fields",
          );
        }
      } else if (type === "boolean") {
        if (trimmedValue !== "true" && trimmedValue !== "false") {
          throw httpError(
            400,
            "invalid_default_value",
            "Default value must be 'true' or 'false' for boolean type fields",
          );
        }
      } else if (type === "date") {
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(trimmedValue)) {
          const parsedDate = new Date(trimmedValue);
          if (Number.isNaN(parsedDate.getTime())) {
            throw httpError(
              400,
              "invalid_default_value",
              "Default value must be a valid date in ISO format (YYYY-MM-DD)",
            );
          }
        }
      } else if (type === "dropdown") {
        if (options && options.length > 0) {
          const normalizedOptions = options.map((opt) => opt.trim());
          if (!normalizedOptions.includes(trimmedValue)) {
            throw httpError(
              400,
              "invalid_default_value",
              "Default value must be one of the dropdown options",
            );
          }
        }
      }
    }
  }

  if (type === "dropdown" && (!options || options.length === 0)) {
    throw httpError(
      400,
      "dropdown_field_requires_options",
      "Dropdown fields must have at least one option",
    );
  }

  const [maxPositionResult] = await db
    .select({ maxPosition: max(customFieldDefinitionTable.position) })
    .from(customFieldDefinitionTable)
    .where(eq(customFieldDefinitionTable.projectId, projectId));

  const field = await db.transaction(async (tx) => {
    const [created] = await tx
      .insert(customFieldDefinitionTable)
      .values({
        projectId,
        name,
        type,
        required,
        defaultValue: defaultValue ?? null,
        options: options ?? null,
        position: (maxPositionResult?.maxPosition ?? 0) + 1,
      })
      .returning();

    if (!created) {
      throw httpError(
        500,
        "failed_to_create_custom_field",
        "Failed to create custom field",
      );
    }

    if (defaultValue != null && defaultValue.trim() !== "") {
      const tasks = await tx
        .select({ id: taskTable.id })
        .from(taskTable)
        .where(eq(taskTable.projectId, projectId));

      const CHUNK_SIZE = 500;
      for (let i = 0; i < tasks.length; i += CHUNK_SIZE) {
        await tx
          .insert(customFieldValueTable)
          .values(
            tasks.slice(i, i + CHUNK_SIZE).map((task) => ({
              taskId: task.id,
              fieldId: created.id,
              value: defaultValue,
            })),
          )
          .onConflictDoNothing();
      }
    }

    return created;
  });

  return field;
}

export default createCustomField;
