import { MUTATION_METHODS } from "../config/constants.js";
import { apiJson } from "../http/response.js";
import { validateMutationRequest } from "../security/request-guards.js";

export async function apiGuardMiddleware(c, next) {
  if (!c.env.DB) {
    return apiJson({ error: "db_not_configured", message: "D1データベースが設定されていません。" }, 503);
  }
  if (MUTATION_METHODS.has(c.req.method.toUpperCase())) {
    const mutationError = validateMutationRequest(c.req.raw, new URL(c.req.url));
    if (mutationError) return mutationError;
  }
  await next();
}
