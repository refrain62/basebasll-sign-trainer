import type { MiddlewareHandler } from "hono";
import type { AppEnv } from "../types.ts";
import { MUTATION_METHODS } from "../config/constants.ts";
import { apiJson } from "../http/response.ts";
import { validateMutationRequest } from "../security/request-guards.ts";
import { dataProtectionConfigError } from "../security/data-protection.ts";

export const apiGuardMiddleware: MiddlewareHandler<AppEnv> = async (c, next) => {
  if (!c.env.DB) {
    return apiJson({ error: "db_not_configured", message: "D1データベースが設定されていません。" }, 503);
  }
  const pathname = new URL(c.req.url).pathname;
  if (!pathname.startsWith("/api/public/")) {
    const protectionError = dataProtectionConfigError(c.env);
    if (protectionError) return apiJson(protectionError, 503);
  }
  if (MUTATION_METHODS.has(c.req.method.toUpperCase())) {
    const mutationError = validateMutationRequest(c.req.raw, new URL(c.req.url));
    if (mutationError) return mutationError;
  }
  await next();
};
