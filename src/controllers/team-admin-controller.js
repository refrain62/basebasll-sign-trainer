import { TEAM_ADMIN_COOKIE } from "../config/constants.js";
import { serviceErrorResponse } from "../http/errors.js";
import { apiJson, safeJson } from "../http/response.js";
import { createAuditRepository } from "../repositories/audit-repository.js";
import { createTeamRepository } from "../repositories/team-repository.js";
import { requireTeamAdmin } from "../security/authorization.js";
import { hashPassword, isSupportedPasswordHash, verifyPasswordDetailed } from "../security/password.js";
import { clearRateLimit, enforceRateLimit } from "../security/rate-limit.js";
import { cookieValue, createSessionToken, nowSeconds, readRoleSession, sessionSecretConfigError } from "../security/session.js";
import { createServices } from "../services/service-factory.js";
import { normalizeSecret, normalizeTeamId, positiveNumber } from "../validation/common.js";

function requestTeamId(body, url) {
  return normalizeTeamId(body?.teamId || url.searchParams.get("teamId"));
}

async function authorizedTeamId(request, env, body, url) {
  const teamId = requestTeamId(body, url);
  if (!teamId || !(await requireTeamAdmin(request, env, teamId))) return "";
  return teamId;
}

async function parseBody(request) {
  const body = await safeJson(request);
  if (body?.__error === "payload_too_large") return { response: apiJson({ error: "payload_too_large" }, 413), body: null };
  return { response: null, body: body || {} };
}

export async function teamAdminSession(request, env, url) {
  const teamId = normalizeTeamId(url.searchParams.get("teamId"));
  if (!teamId) return apiJson({ authenticated: false, error: "invalid_team" }, 400);
  const teams = createTeamRepository(env.DB);
  const team = await teams.findById(teamId);
  if (!team) return apiJson({ authenticated: false, error: "team_not_found", message: "チームが見つかりません。" }, 404);
  const configError = sessionSecretConfigError(env);
  if (configError) return apiJson({ authenticated: false, ...configError }, 503);
  const session = await readRoleSession(request, env, TEAM_ADMIN_COOKIE, "team-admin");
  const authenticated = Boolean(session && session.teamId === teamId && Number(session.ver || 0) === Number(team.admin_session_version || 1));
  return apiJson({ authenticated, teamId, teamName: team.name, status: team.status });
}

export async function teamAdminAuth(request, env, url) {
  const configError = sessionSecretConfigError(env);
  if (configError) return apiJson(configError, 503);
  const { body, response } = await parseBody(request);
  if (response) return response;
  const teamId = normalizeTeamId(body?.teamId);
  const password = normalizeSecret(body?.password);
  if (!teamId || !password) return apiJson({ error: "invalid_request", message: "管理者パスワードを入力してください。" }, 400);

  const limited = await enforceRateLimit({ db: env.DB, sessionSecret: env.SESSION_SECRET, request, scope: "team-admin-auth", identity: teamId, maxAttempts: 8, windowSeconds: 900 });
  if (limited) return limited;
  const teams = createTeamRepository(env.DB);
  const team = await teams.findById(teamId);
  if (!team) return apiJson({ error: "team_not_found", message: "チームが見つかりません。" }, 404);
  if (!isSupportedPasswordHash(team.admin_password_hash)) return apiJson({ error: "team_admin_password_not_configured", message: "このチームの管理者パスワード設定を確認できません。システム管理者から再設定してください。" }, 503);
  const verification = await verifyPasswordDetailed(password, team.admin_password_hash);
  if (!verification.valid) return apiJson({ error: "invalid_password", message: "管理者パスワードが違います。" }, 401);
  if (verification.needsRehash) await teams.rehashAdminPassword(teamId, await hashPassword(password));
  await clearRateLimit({ db: env.DB, sessionSecret: env.SESSION_SECRET, request, scope: "team-admin-auth", identity: teamId });
  await createAuditRepository(env.DB).record("team-admin", teamId, "auth.success", "team", teamId);
  const maxAge = Math.round(positiveNumber(env.ADMIN_SESSION_HOURS, 12) * 3600);
  const token = await createSessionToken({ role: "team-admin", teamId, ver: Number(team.admin_session_version || 1), exp: nowSeconds() + maxAge }, env.SESSION_SECRET);
  return apiJson({ ok: true, teamId, teamName: team.name }, 200, { "set-cookie": cookieValue(TEAM_ADMIN_COOKIE, token, maxAge, url, "Strict") });
}

export async function teamAdminLogout(_request, url) {
  return apiJson({ ok: true }, 200, { "set-cookie": cookieValue(TEAM_ADMIN_COOKIE, "", 0, url, "Strict") });
}

export async function teamAdminGetTeam(request, env, url) {
  const teamId = normalizeTeamId(url.searchParams.get("teamId"));
  if (!teamId || !(await requireTeamAdmin(request, env, teamId))) return apiJson({ error: "unauthorized" }, 401);
  const teams = createTeamRepository(env.DB);
  const team = await teams.findById(teamId);
  if (!team) return apiJson({ error: "team_not_found" }, 404);
  const signs = await teams.getSigns(teamId, { onlyEnabled: false });
  const groups = await teams.getGroups(teamId, { onlyEnabled: false });
  return apiJson({ team: teams.publicTeam(team), groups, signs });
}

export async function teamAdminUpdateTeam(request, env, url) {
  const { body, response } = await parseBody(request);
  if (response) return response;
  const teamId = await authorizedTeamId(request, env, body, url);
  if (!teamId) return apiJson({ error: "unauthorized" }, 401);
  try {
    const team = await createServices(env.DB).team.updateFromTeamAdmin(teamId, body);
    return apiJson({ ok: true, team });
  } catch (error) {
    return serviceErrorResponse(error);
  }
}

export async function teamAdminCreateGroup(request, env, url) {
  const { body, response } = await parseBody(request);
  if (response) return response;
  const teamId = await authorizedTeamId(request, env, body, url);
  if (!teamId) return apiJson({ error: "unauthorized" }, 401);
  try {
    const group = await createServices(env.DB).groups.create(teamId, body);
    return apiJson({ ok: true, group }, 201);
  } catch (error) {
    return serviceErrorResponse(error);
  }
}

export async function teamAdminUpdateGroup(request, env, url, groupId) {
  const { body, response } = await parseBody(request);
  if (response) return response;
  const teamId = await authorizedTeamId(request, env, body, url);
  if (!teamId) return apiJson({ error: "unauthorized" }, 401);
  try {
    const group = await createServices(env.DB).groups.update(teamId, groupId, body);
    return apiJson({ ok: true, group });
  } catch (error) {
    return serviceErrorResponse(error);
  }
}

export async function teamAdminDeleteGroup(request, env, url, groupId) {
  const teamId = normalizeTeamId(url.searchParams.get("teamId"));
  if (!teamId || !(await requireTeamAdmin(request, env, teamId))) return apiJson({ error: "unauthorized" }, 401);
  try {
    await createServices(env.DB).groups.remove(teamId, groupId);
    return apiJson({ ok: true });
  } catch (error) {
    return serviceErrorResponse(error);
  }
}

export async function teamAdminCreateSign(request, env, url) {
  const { body, response } = await parseBody(request);
  if (response) return response;
  const teamId = await authorizedTeamId(request, env, body, url);
  if (!teamId) return apiJson({ error: "unauthorized" }, 401);
  try {
    const sign = await createServices(env.DB).signs.create(teamId, body);
    return apiJson({ ok: true, sign }, 201);
  } catch (error) {
    return serviceErrorResponse(error);
  }
}

export async function teamAdminUpdateSign(request, env, url, signId) {
  const { body, response } = await parseBody(request);
  if (response) return response;
  const teamId = await authorizedTeamId(request, env, body, url);
  if (!teamId) return apiJson({ error: "unauthorized" }, 401);
  try {
    const sign = await createServices(env.DB).signs.update(teamId, signId, body);
    return apiJson({ ok: true, sign });
  } catch (error) {
    return serviceErrorResponse(error);
  }
}

export async function teamAdminDeleteSign(request, env, url, signId) {
  const teamId = normalizeTeamId(url.searchParams.get("teamId"));
  if (!teamId || !(await requireTeamAdmin(request, env, teamId))) return apiJson({ error: "unauthorized" }, 401);
  try {
    await createServices(env.DB).signs.remove(teamId, signId);
    return apiJson({ ok: true });
  } catch (error) {
    return serviceErrorResponse(error);
  }
}

export async function teamAdminCreateVideo(request, env, url, signId) {
  const { body, response } = await parseBody(request);
  if (response) return response;
  const teamId = await authorizedTeamId(request, env, body, url);
  if (!teamId) return apiJson({ error: "unauthorized" }, 401);
  try {
    const result = await createServices(env.DB).videos.create(teamId, signId, body);
    return apiJson({ ok: true, videoId: result.videoId, sign: result.sign }, 201);
  } catch (error) {
    return serviceErrorResponse(error);
  }
}

export async function teamAdminUpdateVideo(request, env, url, videoId) {
  const { body, response } = await parseBody(request);
  if (response) return response;
  const teamId = await authorizedTeamId(request, env, body, url);
  if (!teamId) return apiJson({ error: "unauthorized" }, 401);
  try {
    const sign = await createServices(env.DB).videos.update(teamId, videoId, body);
    return apiJson({ ok: true, sign });
  } catch (error) {
    return serviceErrorResponse(error);
  }
}

export async function teamAdminDeleteVideo(request, env, url, videoId) {
  const teamId = normalizeTeamId(url.searchParams.get("teamId"));
  if (!teamId || !(await requireTeamAdmin(request, env, teamId))) return apiJson({ error: "unauthorized" }, 401);
  try {
    const sign = await createServices(env.DB).videos.remove(teamId, videoId);
    return apiJson({ ok: true, sign });
  } catch (error) {
    return serviceErrorResponse(error);
  }
}
