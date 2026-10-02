import type { MiddlewareHandler } from "hono";
import type { AppEnv, WorkerBindings } from "../types.ts";
import { validateCloudflareAccess } from "../security/request-guards.ts";
import { isLocalHostname } from "../security/session.ts";

export function requiresEnvironmentAccess(env: WorkerBindings, hostname: string) {
  const environment = String(env.ENVIRONMENT || "").trim().toLowerCase();
  const enabled = String(env.REQUIRE_CF_ACCESS_FOR_ENVIRONMENT || "false") === "true";
  return enabled && (environment === "dev" || environment === "staging") && !isLocalHostname(hostname);
}

export const environmentAccessMiddleware: MiddlewareHandler<AppEnv> = async (c, next) => {
  const url = new URL(c.req.url);
  if (requiresEnvironmentAccess(c.env, url.hostname)) {
    const accessError = await validateCloudflareAccess(c.req.raw, c.env, {
      allowedEmails: c.env.ENVIRONMENT_ACCESS_ALLOWED_EMAILS,
      missingTokenMessage: "This environment is protected by Cloudflare Access."
    });
    if (accessError) return accessError;
  }
  await next();
};
