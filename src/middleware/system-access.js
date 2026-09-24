import { isSystemAdminPath, validateCloudflareAccess } from "../security/request-guards.js";
import { isLocalHostname } from "../security/session.js";

export async function systemAccessMiddleware(c, next) {
  const url = new URL(c.req.url);
  if (
    isSystemAdminPath(url.pathname) &&
    String(c.env.REQUIRE_CF_ACCESS_FOR_SYSTEM_ADMIN || "false") === "true" &&
    !isLocalHostname(url.hostname)
  ) {
    const accessError = await validateCloudflareAccess(c.req.raw, c.env);
    if (accessError) return accessError;
  }
  await next();
}
