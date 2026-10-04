import type { Context } from "hono";
import { httpError } from "../../utils/http-error";
import { isInstanceAdmin } from "../../utils/is-instance-admin";
import { describeAiConfig } from "../config";

async function getAiConfig(c: Context) {
  if (!(await isInstanceAdmin(c))) {
    throw httpError(403, "forbidden", "Instance admin access required");
  }
  return describeAiConfig();
}

export default getAiConfig;
