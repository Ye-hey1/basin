import { randomBytes } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import db from "../../database";
import { integrationTable, projectTable } from "../../database/schema";
import {
  type GiteaConfig,
  getDefaultGiteaConfig,
  normalizeGiteaBaseUrl,
  validateGiteaConfig,
} from "../../plugins/gitea/config";
import {
  createGiteaClient,
  GiteaApiError,
  verifyGiteaToken,
} from "../../plugins/gitea/utils/gitea-api";
import { httpError } from "../../utils/http-error";

async function createGiteaIntegration({
  projectId,
  baseUrl,
  accessToken,
  repositoryOwner,
  repositoryName,
}: {
  projectId: string;
  baseUrl: string;
  accessToken: string | undefined;
  repositoryOwner: string;
  repositoryName: string;
}) {
  const project = await db.query.projectTable.findFirst({
    where: eq(projectTable.id, projectId),
  });

  if (!project) {
    throw httpError(404, "project_not_found", "Project not found");
  }

  const normalizedBase = normalizeGiteaBaseUrl(baseUrl);

  const existingIntegration = await db.query.integrationTable.findFirst({
    where: and(
      eq(integrationTable.projectId, projectId),
      eq(integrationTable.type, "gitea"),
    ),
  });

  let resolvedToken = accessToken?.trim() ?? "";
  if (!resolvedToken && existingIntegration) {
    try {
      const prev = JSON.parse(existingIntegration.config) as GiteaConfig;
      resolvedToken = prev.accessToken;
    } catch (error) {
      console.warn("Failed to parse existing Gitea integration config", {
        integrationId: existingIntegration.id,
        error,
      });
    }
  }

  if (!resolvedToken) {
    throw httpError(
      400,
      "personal_access_token_is_required",
      "Personal access token is required",
    );
  }

  try {
    await verifyGiteaToken(normalizedBase, resolvedToken);

    const client = createGiteaClient({
      baseUrl: normalizedBase,
      accessToken: resolvedToken,
    });
    await client.getRepo(repositoryOwner, repositoryName);
  } catch (error) {
    if (error instanceof GiteaApiError) {
      throw httpError(
        (error.status || 400) as ContentfulStatusCode,
        "gitea_integration_error",
        error.message,
      );
    }
    throw error;
  }

  const allGitea = await db.query.integrationTable.findMany({
    where: eq(integrationTable.type, "gitea"),
  });

  for (const integration of allGitea) {
    if (integration.projectId === projectId) {
      continue;
    }
    if (!integration.isActive) {
      continue;
    }
    try {
      const cfg = JSON.parse(integration.config) as {
        baseUrl?: string;
        repositoryOwner?: string;
        repositoryName?: string;
      };
      if (
        normalizeGiteaBaseUrl(cfg.baseUrl ?? "") === normalizedBase &&
        cfg.repositoryOwner === repositoryOwner &&
        cfg.repositoryName === repositoryName
      ) {
        throw httpError(
          409,
          "repository_already_linked",
          `Repository ${repositoryOwner}/${repositoryName} on this Gitea instance is already linked to another project`,
        );
      }
    } catch (error) {
      if (error instanceof HTTPException) {
        throw error;
      }
      console.warn(
        "Skipping invalid Gitea integration config during conflict check",
        {
          integrationId: integration.id,
          error,
        },
      );
    }
  }

  let webhookSecret = randomBytes(24).toString("hex");
  if (existingIntegration) {
    try {
      const previousConfig = JSON.parse(
        existingIntegration.config,
      ) as GiteaConfig;
      webhookSecret = previousConfig.webhookSecret ?? webhookSecret;
    } catch (error) {
      console.warn("Failed to parse existing Gitea config for webhook secret", {
        integrationId: existingIntegration.id,
        error,
      });
    }
  }

  const config: GiteaConfig = getDefaultGiteaConfig(
    normalizedBase,
    resolvedToken,
    repositoryOwner,
    repositoryName,
    webhookSecret,
  );

  const validation = await validateGiteaConfig(config);
  if (!validation.valid) {
    throw httpError(
      400,
      "invalid_config",
      validation.errors?.join(", ") ?? "Invalid config",
    );
  }

  if (existingIntegration) {
    const [updated] = await db
      .update(integrationTable)
      .set({
        config: JSON.stringify(config),
        isActive: true,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(integrationTable.projectId, projectId),
          eq(integrationTable.type, "gitea"),
        ),
      )
      .returning();

    if (!updated) {
      throw httpError(
        500,
        "failed_to_update_gitea_integration",
        "Failed to update Gitea integration",
      );
    }

    return {
      id: updated.id,
      projectId: updated.projectId,
      baseUrl: normalizedBase,
      repositoryOwner,
      repositoryName,
      webhookSecret,
      isActive: updated.isActive,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    };
  }

  const [newIntegration] = await db
    .insert(integrationTable)
    .values({
      projectId,
      type: "gitea",
      config: JSON.stringify(config),
      isActive: true,
    })
    .returning();

  if (!newIntegration) {
    throw httpError(
      500,
      "failed_to_create_gitea_integration",
      "Failed to create Gitea integration",
    );
  }

  return {
    id: newIntegration.id,
    projectId: newIntegration.projectId,
    baseUrl: normalizedBase,
    repositoryOwner,
    repositoryName,
    webhookSecret,
    isActive: newIntegration.isActive,
    createdAt: newIntegration.createdAt,
    updatedAt: newIntegration.updatedAt,
  };
}

export default createGiteaIntegration;
