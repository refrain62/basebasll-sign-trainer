import { PLAYER_COOKIE, SAMPLE_TEAM_ID } from "../config/constants.js";
import { apiJson, safeJson } from "../http/response.js";
import { createAuditRepository } from "../repositories/audit-repository.js";
import { createTeamRepository } from "../repositories/team-repository.js";
import { isSupportedPasswordHash, hashPassword, verifyPasswordDetailed } from "../security/password.js";
import { clearRateLimit, enforceRateLimit } from "../security/rate-limit.js";
import { cookieValue, createSessionToken, nowSeconds, readRoleSession, sessionSecretConfigError } from "../security/session.js";
import { normalizeSecret, normalizeTeamId, positiveNumber } from "../validation/common.js";

export async function playerSession(request, env, url) {
  const teamId = normalizeTeamId(url.searchParams.get("teamId"));
  if (!teamId) return apiJson({ authenticated: false, error: "invalid_team" }, 400);
  const teams = createTeamRepository(env.DB);
  const team = await teams.findById(teamId);
  if (!team) return apiJson({ authenticated: false, error: "team_not_found", message: "チームが見つかりません。" }, 404);
  if (team.status !== "active") return apiJson({ authenticated: false, error: "team_inactive", teamId, teamName: team.name, message: "このチームは現在利用停止中です。" }, 403);
  const configError = sessionSecretConfigError(env);
  if (configError) return apiJson({ authenticated: false, ...configError }, 503);
  const session = await readRoleSession(request, env, PLAYER_COOKIE, "player");
  const authenticated = Boolean(session && session.teamId === teamId && Number(session.ver || 0) === Number(team.player_session_version || 1));
  return apiJson({ authenticated, teamId, teamName: team.name, isSample: teamId === SAMPLE_TEAM_ID });
}

export async function playerAuth(request, env, url) {
  const configError = sessionSecretConfigError(env);
  if (configError) return apiJson(configError, 503);
  const body = await safeJson(request);
  if (body?.__error === "payload_too_large") return apiJson({ error: "payload_too_large", message: "送信内容が大きすぎます。" }, 413);
  const teamId = normalizeTeamId(body?.teamId);
  const passphrase = normalizeSecret(body?.passphrase);
  if (!teamId || !passphrase) return apiJson({ error: "invalid_request", message: "チームと合言葉を確認してください。" }, 400);

  const limited = await enforceRateLimit({ db: env.DB, sessionSecret: env.SESSION_SECRET, request, scope: "player-auth", identity: teamId, maxAttempts: 10, windowSeconds: 600 });
  if (limited) return limited;
  const teams = createTeamRepository(env.DB);
  const team = await teams.findById(teamId);
  if (!team) return apiJson({ error: "team_not_found", message: "チームが見つかりません。" }, 404);
  if (team.status !== "active") return apiJson({ error: "team_inactive", message: "このチームは現在利用停止中です。" }, 403);
  if (!isSupportedPasswordHash(team.passphrase_hash)) return apiJson({ error: "team_passphrase_not_configured", message: "このチームの合言葉設定を確認できません。チーム管理者に再設定を依頼してください。" }, 503);
  const verification = await verifyPasswordDetailed(passphrase, team.passphrase_hash);
  if (!verification.valid) return apiJson({ error: "invalid_passphrase", message: "合言葉が違うようです。" }, 401);
  if (verification.needsRehash) await teams.rehashPassphrase(teamId, await hashPassword(passphrase));
  await clearRateLimit({ db: env.DB, sessionSecret: env.SESSION_SECRET, request, scope: "player-auth", identity: teamId });
  const maxAge = Math.round(positiveNumber(env.SESSION_DAYS, 30) * 86400);
  const token = await createSessionToken({ role: "player", teamId, ver: Number(team.player_session_version || 1), exp: nowSeconds() + maxAge }, env.SESSION_SECRET);
  return apiJson({ ok: true, teamId, teamName: team.name }, 200, { "set-cookie": cookieValue(PLAYER_COOKIE, token, maxAge, url, "Lax") });
}

export async function playerLogout(_request, url) {
  return apiJson({ ok: true }, 200, { "set-cookie": cookieValue(PLAYER_COOKIE, "", 0, url) });
}

export async function playerSigns(request, env, url) {
  const teamId = normalizeTeamId(url.searchParams.get("teamId"));
  if (!teamId) return apiJson({ error: "invalid_team" }, 400);
  const teams = createTeamRepository(env.DB);
  const session = await readRoleSession(request, env, PLAYER_COOKIE, "player");
  const team = await teams.findById(teamId);
  if (!team || team.status !== "active") return apiJson({ error: "team_inactive", message: "チームを利用できません。" }, 403);
  if (!session || session.teamId !== teamId || Number(session.ver || 0) !== Number(team.player_session_version || 1)) return apiJson({ error: "unauthorized", message: "合言葉を入力してください。" }, 401);
  const signs = await teams.getSigns(teamId, { onlyEnabled: true });
  const groups = await teams.getGroups(teamId, { onlyEnabled: true });
  return apiJson({ team: { id: team.id, name: team.name }, groups, signs });
}
