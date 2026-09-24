import { SYSTEM_COOKIE } from "../config/constants.js";
import { serviceErrorResponse } from "../http/errors.js";
import { apiJson, safeJson } from "../http/response.js";
import { createAuditRepository } from "../repositories/audit-repository.js";
import { requireSystem } from "../security/authorization.js";
import { constantTimeEqual } from "../security/encoding.js";
import { clearRateLimit, enforceRateLimit } from "../security/rate-limit.js";
import { cookieValue, createSessionToken, nowSeconds, sessionSecretConfigError, systemAdminSecretConfigError, systemSecretVersion } from "../security/session.js";
import { createServices } from "../services/service-factory.js";
import { normalizeSecret, positiveNumber } from "../validation/common.js";

async function parseBody(request) {
  const body = await safeJson(request);
  if (body?.__error === "payload_too_large") return { response: apiJson({ error: "payload_too_large" }, 413), body: null };
  return { response: null, body: body || {} };
}

export async function systemSession(request, env) {
  const sessionConfigError = sessionSecretConfigError(env);
  if (sessionConfigError) return apiJson({ authenticated: false, ...sessionConfigError }, 503);
  const adminConfigError = systemAdminSecretConfigError(env);
  if (adminConfigError) return apiJson({ authenticated: false, ...adminConfigError }, 503);
  const session = await requireSystem(request, env);
  return apiJson({ authenticated: Boolean(session) });
}

export async function systemAuth(request, env, url) {
  const sessionConfigError = sessionSecretConfigError(env);
  if (sessionConfigError) return apiJson(sessionConfigError, 503);
  const adminConfigError = systemAdminSecretConfigError(env);
  if (adminConfigError) return apiJson(adminConfigError, 503);
  const limited = await enforceRateLimit({ db: env.DB, sessionSecret: env.SESSION_SECRET, request, scope: "system-auth", identity: "global", maxAttempts: 6, windowSeconds: 900 });
  if (limited) return limited;

  const { body, response } = await parseBody(request);
  if (response) return response;
  const secret = normalizeSecret(body?.secret);
  if (!secret || !constantTimeEqual(secret, normalizeSecret(env.SYSTEM_ADMIN_SECRET))) return apiJson({ error: "invalid_secret", message: "管理者キーが違います。" }, 401);
  await clearRateLimit({ db: env.DB, sessionSecret: env.SESSION_SECRET, request, scope: "system-auth", identity: "global" });
  await createAuditRepository(env.DB).record("system", null, "auth.success", "system", null);
  const maxAge = Math.round(positiveNumber(env.ADMIN_SESSION_HOURS, 12) * 3600);
  const token = await createSessionToken({ role: "system", ver: await systemSecretVersion(env.SYSTEM_ADMIN_SECRET), exp: nowSeconds() + maxAge }, env.SESSION_SECRET);
  return apiJson({ ok: true }, 200, { "set-cookie": cookieValue(SYSTEM_COOKIE, token, maxAge, url, "Strict") });
}

export async function systemLogout(_request, url) {
  return apiJson({ ok: true }, 200, { "set-cookie": cookieValue(SYSTEM_COOKIE, "", 0, url, "Strict") });
}

export async function systemListTeams(request, env) {
  if (!(await requireSystem(request, env))) return apiJson({ error: "unauthorized" }, 401);
  return apiJson({ teams: await createServices(env.DB).systemTeams.list() });
}

export async function systemCreateTeam(request, env) {
  if (!(await requireSystem(request, env))) return apiJson({ error: "unauthorized" }, 401);
  const { body, response } = await parseBody(request);
  if (response) return response;
  try {
    const result = await createServices(env.DB).systemTeams.create(body);
    return apiJson({ ok: true, ...result }, 201);
  } catch (error) {
    return serviceErrorResponse(error);
  }
}

export async function systemUpdateTeam(request, env, teamId) {
  if (!(await requireSystem(request, env))) return apiJson({ error: "unauthorized" }, 401);
  const { body, response } = await parseBody(request);
  if (response) return response;
  try {
    const team = await createServices(env.DB).systemTeams.update(teamId, body);
    return apiJson({ ok: true, team });
  } catch (error) {
    return serviceErrorResponse(error);
  }
}

export async function systemDeleteTeam(request, env, teamId) {
  if (!(await requireSystem(request, env))) return apiJson({ error: "unauthorized" }, 401);
  try {
    await createServices(env.DB).systemTeams.remove(teamId);
    return apiJson({ ok: true });
  } catch (error) {
    return serviceErrorResponse(error);
  }
}
