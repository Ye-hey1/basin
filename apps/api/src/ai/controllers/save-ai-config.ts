import type { AiProviderConfigInput } from "@basin/ai";
import type { Context } from "hono";
import { httpError } from "../../utils/http-error";
import { isInstanceAdmin } from "../../utils/is-instance-admin";
import {
  describeAiConfig,
  getProviderConfigRow,
  probeEmbeddingDimensions,
  saveAiProviderConfig,
} from "../config";
import { decryptAiSecret } from "../crypto";

async function saveAiConfig(c: Context, input: AiProviderConfigInput) {
  if (!(await isInstanceAdmin(c))) {
    throw httpError(403, "forbidden", "Instance admin access required");
  }

  // The probe needs a usable key: on edit without retyping the secret, fall
  // back to the stored one so validation does not force re-entering it.
  const probeApiKey =
    input.apiKey !== undefined && input.apiKey !== null
      ? input.apiKey
      : (decryptAiSecret((await getProviderConfigRow())?.apiKeyEncrypted) ??
        null);

  const dimensions = await probeEmbeddingDimensions({
    ...input,
    apiKey: probeApiKey,
  });

  await saveAiProviderConfig({ ...input, embeddingDimensions: dimensions });
  return describeAiConfig();
}

export default saveAiConfig;
