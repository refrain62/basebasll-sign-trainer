import { SYSTEM_COOKIE } from "../config/constants.ts";
import { serviceErrorResponse } from "../http/errors.ts";
import { apiJson } from "../http/response.ts";
import { createAuditRepository } from "../repositories/audit-repository.ts";
import { requireSystem } from "../security/authorization.ts";
import { constantTimeEqual } from "../security/encoding.ts";
import { clearRateLimit, enforceRateLimit } from "../security/rate-limit.ts";
import { cookieValue, createSessionToken, nowSeconds, sessionSecretConfigError, systemAdminSecretConfigError, systemSecretVersion } from "../security/session.ts";
import { createServices } from "../services/service-factory.ts";
import { normalizeSecret, positiveNumber } from "../validation/common.ts";
import { parseJsonBody } from "../validation/request.ts";
import { dataProtectionBodySchema, systemAuthBodySchema, systemCreateTeamBodySchema, systemUpdateTeamBodySchema } from "../validation/schemas.ts";


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

  const parsed = await parseJsonBody(request, systemAuthBodySchema);
  if (parsed.response) return parsed.response;
  const secret = normalizeSecret(parsed.data.secret);
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
  return apiJson({ teams: await createServices(env.DB, env).systemTeams.list() });
}

export async function systemCreateTeam(request, env) {
  if (!(await requireSystem(request, env))) return apiJson({ error: "unauthorized" }, 401);
  const parsed = await parseJsonBody(request, systemCreateTeamBodySchema);
  if (parsed.response) return parsed.response;
  try {
    const result = await createServices(env.DB, env).systemTeams.create(parsed.data);
    return apiJson({ ok: true, ...result }, 201);
  } catch (error) {
    return serviceErrorResponse(error);
  }
}

export async function systemUpdateTeam(request, env, teamId) {
  if (!(await requireSystem(request, env))) return apiJson({ error: "unauthorized" }, 401);
  const parsed = await parseJsonBody(request, systemUpdateTeamBodySchema);
  if (parsed.response) return parsed.response;
  try {
    const team = await createServices(env.DB, env).systemTeams.update(teamId, parsed.data);
    return apiJson({ ok: true, team });
  } catch (error) {
    return serviceErrorResponse(error);
  }
}

export async function systemDeleteTeam(request, env, teamId) {
  if (!(await requireSystem(request, env))) return apiJson({ error: "unauthorized" }, 401);
  try {
    await createServices(env.DB, env).systemTeams.remove(teamId);
    return apiJson({ ok: true });
  } catch (error) {
    return serviceErrorResponse(error);
  }
}

export async function systemDataProtectionStatus(request, env) {
  if (!(await requireSystem(request, env))) return apiJson({ error: "unauthorized" }, 401);
  try {
    const remaining = await createServices(env.DB, env).dataProtection.status();
    return apiJson({ ok: true, remaining, complete: Object.values(remaining).every((value) => Number(value) === 0) });
  } catch (error) {
    return serviceErrorResponse(error);
  }
}

export async function systemProtectData(request, env) {
  if (!(await requireSystem(request, env))) return apiJson({ error: "unauthorized" }, 401);
  const parsed = await parseJsonBody(request, dataProtectionBodySchema);
  if (parsed.response) return parsed.response;
  try {
    const result = await createServices(env.DB, env).dataProtection.protectExisting({
      batchSize: parsed.data.batchSize === undefined ? undefined : Number(parsed.data.batchSize),
      maxBatches: parsed.data.maxBatches === undefined ? undefined : Number(parsed.data.maxBatches)
    });
    await createAuditRepository(env.DB).record("system", null, "data_protection.migrate", "system", null, {
      complete: result.complete,
      protectedCounts: result.protected,
      remainingCounts: result.remaining
    });
    return apiJson({ ok: true, ...result });
  } catch (error) {
    return serviceErrorResponse(error);
  }
}
