import { TEAM_ADMIN_COOKIE, USER_COOKIE } from "../config/constants.ts";
import { FEATURE_KEYS } from "../config/features.ts";
import { serviceErrorResponse } from "../http/errors.ts";
import { apiJson, withHeaders } from "../http/response.ts";
import { createAuditRepository } from "../repositories/audit-repository.ts";
import { createTeamRepository, getSignWithVideos } from "../repositories/team-repository.ts";
import { requireTeamAdmin, requireTeamOwner, requireUser } from "../security/authorization.ts";
import { hashPassword, isSupportedPasswordHash, verifyPasswordDetailed } from "../security/password.ts";
import { createDataProtectorFromEnv } from "../security/data-protection.ts";
import { clearRateLimit, enforceRateLimit } from "../security/rate-limit.ts";
import { cookieValue, createSessionToken, isFreshAccountSession, nowSeconds, readRoleSession, sessionSecretConfigError } from "../security/session.ts";
import { createServices } from "../services/service-factory.ts";
import { normalizeTeamId, positiveNumber } from "../validation/common.ts";
import { parseJsonBody } from "../validation/request.ts";
import { adminInviteBodySchema, groupCreateBodySchema, groupUpdateBodySchema, ownerTransferBodySchema, signCreateBodySchema, signUpdateBodySchema, teamAdminAuthBodySchema, teamAdminDeleteTeamBodySchema, teamAdminUpdateTeamBodySchema, videoCreateBodySchema, videoUpdateBodySchema } from "../validation/schemas.ts";

function requestTeamId(body, url) {
  return normalizeTeamId(body?.teamId || url.searchParams.get("teamId"));
}

async function authorizedTeamId(request, env, body, url) {
  const teamId = requestTeamId(body, url);
  if (!teamId || !(await requireTeamAdmin(request, env, teamId))) return "";
  return teamId;
}

function auditActorFromAuth(auth) {
  if (!auth || auth.authType !== "account") return { role: "team-admin", userId: null };
  return { role: auth.teamRole === "owner" ? "account-owner" : "account-admin", userId: auth.userId || auth.user?.id || null };
}


function freshAuthRequired(auth, teamId) {
  return apiJson({
    error: "reauth_required",
    message: "重要な操作のため、Google / LINEで本人確認をもう一度行ってください。認証後に操作を再実行できます。",
    provider: ["google", "line"].includes(String(auth?.provider || "")) ? auth.provider : "",
    returnTo: `/t/${encodeURIComponent(teamId)}/admin`
  }, 428);
}

export async function teamAdminSession(request, env, url) {
  const teamId = normalizeTeamId(url.searchParams.get("teamId"));
  if (!teamId) return apiJson({ authenticated: false, error: "invalid_team" }, 400);
  const teams = createTeamRepository(env.DB, createDataProtectorFromEnv(env));
  const team = await teams.findById(teamId);
  if (!team) return apiJson({ authenticated: false, error: "team_not_found", message: "チームが見つかりません。" }, 404);
  const configError = sessionSecretConfigError(env);
  if (configError) return apiJson({ authenticated: false, ...configError }, 503);
  const services = createServices(env.DB, env);
  const auth = await requireTeamAdmin(request, env, teamId);
  const accountManaged = await services.repositories.membershipRepository.hasAny(teamId);
  let accessError = null;
  if (!auth) {
    const account = await requireUser(request, env);
    const membership = account ? await services.repositories.membershipRepository.find(teamId, account.userId) : null;
    if (membership?.role === "admin" && !(await services.entitlements.canUseFeature(teamId, FEATURE_KEYS.SUB_ADMIN_MANAGEMENT))) {
      accessError = {
        error: "sub_admin_plan_required",
        message: "このチームのサブ管理者機能は現在利用できません。メイン管理者へご確認ください。既存のサブ管理者情報は保持されています。"
      };
    }
  }
  return apiJson({
    authenticated: Boolean(auth),
    ...(accessError || {}),
    teamId,
    teamName: team.name,
    status: team.status,
    authType: auth?.authType || "",
    role: auth?.teamRole || "",
    user: auth?.authType === "account" ? { id: auth.user.id, displayName: auth.user.display_name, email: auth.user.email || "", avatarUrl: auth.user.avatar_url || "" } : null,
    legacyPasswordEnabled: Boolean(team.admin_password_enabled),
    accountManaged
  });
}

export async function teamAdminAuth(request, env, url) {
  const configError = sessionSecretConfigError(env);
  if (configError) return apiJson(configError, 503);
  const parsed = await parseJsonBody(request, teamAdminAuthBodySchema);
  if (parsed.response) return parsed.response;
  const { teamId, password } = parsed.data;
  if (!password) return apiJson({ error: "invalid_request", message: "管理者パスワードを入力してください。" }, 400);

  const globalLimited = await enforceRateLimit({ db: env.DB, sessionSecret: env.SESSION_SECRET, request, scope: "team-admin-auth-global", identity: "global", maxAttempts: 30, windowSeconds: 900 });
  if (globalLimited) return globalLimited;
  const teams = createTeamRepository(env.DB, createDataProtectorFromEnv(env));
  const team = await teams.findById(teamId);
  if (!team) return apiJson({ error: "team_not_found", message: "チームが見つかりません。" }, 404);
  const limited = await enforceRateLimit({ db: env.DB, sessionSecret: env.SESSION_SECRET, request, scope: "team-admin-auth", identity: teamId, maxAttempts: 8, windowSeconds: 900 });
  if (limited) return limited;
  if (!team.admin_password_enabled) return apiJson({ error: "legacy_password_disabled", message: "このチームはGoogle / LINEアカウントで管理しています。アカウントでログインしてください。" }, 403);
  if (!isSupportedPasswordHash(team.admin_password_hash)) return apiJson({ error: "team_admin_password_not_configured", message: "このチームの管理者パスワード設定を確認できません。システム管理者から再設定してください。" }, 503);
  const verification = await verifyPasswordDetailed(password, team.admin_password_hash, env.PASSWORD_PEPPER);
  if (!verification.valid) return apiJson({ error: "invalid_password", message: "管理者パスワードが違います。" }, 401);
  if (verification.needsRehash) await teams.rehashAdminPassword(teamId, await hashPassword(password, env.PASSWORD_PEPPER));
  await clearRateLimit({ db: env.DB, sessionSecret: env.SESSION_SECRET, request, scope: "team-admin-auth", identity: teamId });
  await createAuditRepository(env.DB).record("team-admin", teamId, "auth.success", "team", teamId);
  const maxAge = Math.round(positiveNumber(env.ADMIN_SESSION_HOURS, 12) * 3600);
  const token = await createSessionToken({ role: "team-admin", teamId, ver: Number(team.admin_session_version || 1), exp: nowSeconds() + maxAge }, env.SESSION_SECRET);
  return apiJson({ ok: true, teamId, teamName: team.name }, 200, { "set-cookie": cookieValue(TEAM_ADMIN_COOKIE, token, maxAge, url, "Strict") });
}

export async function teamAdminLogout(_request, url) {
  const headers = new Headers({ "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
  headers.append("set-cookie", cookieValue(TEAM_ADMIN_COOKIE, "", 0, url, "Strict"));
  headers.append("set-cookie", cookieValue(USER_COOKIE, "", 0, url, "Lax"));
  return withHeaders(new Response(JSON.stringify({ ok: true }), { status: 200, headers }), { noIndex: true, noCache: true });
}

export async function teamAdminGetTeam(request, env, url) {
  const teamId = normalizeTeamId(url.searchParams.get("teamId"));
  const auth = teamId ? await requireTeamAdmin(request, env, teamId) : null;
  if (!teamId || !auth) return apiJson({ error: "unauthorized" }, 401);
  const services = createServices(env.DB, env);
  const teams = services.repositories.teamRepository;
  const team = await teams.findById(teamId);
  if (!team) return apiJson({ error: "team_not_found" }, 404);
  const signs = await teams.getSigns(teamId, { onlyEnabled: false });
  const groups = await teams.getGroups(teamId, { onlyEnabled: false });
  const accountManaged = await services.repositories.membershipRepository.hasAny(teamId);
  let adminManagement = null;
  if (auth.authType === "account") {
    try { adminManagement = await services.adminMembership.management(teamId, auth.userId); }
    catch { adminManagement = null; }
  }
  const planState = await services.entitlements.summary(teamId);
  return apiJson({
    team: { ...teams.publicTeam(team), legacyPasswordEnabled: Boolean(team.admin_password_enabled) },
    plan: planState,
    groups,
    signs,
    auth: {
      type: auth.authType,
      role: auth.teamRole,
      user: auth.authType === "account" ? { id: auth.user.id, displayName: auth.user.display_name, email: auth.user.email || "", avatarUrl: auth.user.avatar_url || "" } : null
    },
    adminManagement,
    accountManaged
  });
}

export async function teamAdminActivity(request, env, url) {
  const teamId = normalizeTeamId(url.searchParams.get("teamId"));
  const auth = teamId ? await requireTeamAdmin(request, env, teamId) : null;
  if (!teamId || !auth) return apiJson({ error: "unauthorized" }, 401);
  try {
    const services = createServices(env.DB, env);
    await services.entitlements.assertFeature(teamId, FEATURE_KEYS.ACTIVITY_LOG, "最近のアクティビティはPro機能です。");
    const rows = await services.repositories.auditRepository.listTeam(teamId, 150);
    const names = new Map();
    for (const userId of [...new Set(rows.map((row) => row.actorUserId).filter(Boolean))]) {
      const user = await services.repositories.userRepository.findById(userId);
      names.set(userId, user?.display_name || "退会済み管理者");
    }
    const activity = rows.map((row) => ({
      ...row,
      actorName: row.actorUserId
        ? (names.get(row.actorUserId) || "管理者")
        : row.actorRole === "team-admin"
          ? "共有管理者パスワード"
          : row.actorRole === "system"
            ? "システム管理者"
            : "管理者（旧ログ）"
    }));
    return apiJson({ activity });
  } catch (error) {
    return serviceErrorResponse(error);
  }
}

export async function teamAdminUpdateTeam(request, env, url) {
  const parsed = await parseJsonBody(request, teamAdminUpdateTeamBodySchema);
  if (parsed.response) return parsed.response;
  const body = parsed.data;
  const teamId = requestTeamId(body, url);
  const auth = teamId ? await requireTeamAdmin(request, env, teamId) : null;
  if (!teamId || !auth) return apiJson({ error: "unauthorized" }, 401);
  const canChangeAdminPassword = auth.authType === "legacy-password" || auth.teamRole === "owner";
  if (auth.authType === "account" && body?.adminPassword && !isFreshAccountSession(auth)) return freshAuthRequired(auth, teamId);
  try {
    const team = await createServices(env.DB, env).team.updateFromTeamAdmin(teamId, body, { canChangeAdminPassword, auditActor: auditActorFromAuth(auth) });
    return apiJson({ ok: true, team });
  } catch (error) {
    return serviceErrorResponse(error);
  }
}

export async function teamAdminDeleteTeam(request, env, url) {
  const parsed = await parseJsonBody(request, teamAdminDeleteTeamBodySchema);
  if (parsed.response) return parsed.response;
  const body = parsed.data;
  const teamId = requestTeamId(body, url);
  const auth = teamId ? await requireTeamAdmin(request, env, teamId) : null;
  if (!teamId || !auth) return apiJson({ error: "unauthorized" }, 401);

  const services = createServices(env.DB, env);
  if (auth.authType === "account") {
    if (auth.teamRole !== "owner") return apiJson({ error: "owner_required", message: "チームの退会手続きはメイン管理者のみ実行できます。" }, 403);
    if (!isFreshAccountSession(auth)) return freshAuthRequired(auth, teamId);
  } else if (await services.repositories.membershipRepository.hasAny(teamId)) {
    return apiJson({ error: "owner_account_required", message: "このチームは管理者アカウントへ移行済みです。メイン管理者がGoogle / LINEでログインして退会手続きを行ってください。" }, 403);
  }

  try {
    return apiJson(await services.team.withdrawFromTeamAdmin(teamId, body, { auditActor: auditActorFromAuth(auth) }));
  } catch (error) {
    return serviceErrorResponse(error);
  }
}

export async function teamAdminCreateGroup(request, env, url) {
  const parsed = await parseJsonBody(request, groupCreateBodySchema);
  if (parsed.response) return parsed.response;
  const body = parsed.data;
  const teamId = requestTeamId(body, url);
  const auth = teamId ? await requireTeamAdmin(request, env, teamId) : null;
  if (!teamId || !auth) return apiJson({ error: "unauthorized" }, 401);
  try {
    const services = createServices(env.DB, env);
    const existingGroups = await services.repositories.teamRepository.getGroups(teamId, { onlyEnabled: false });
    if (existingGroups.length >= 1) {
      await services.entitlements.assertFeature(teamId, FEATURE_KEYS.MULTIPLE_SIGN_GROUPS, "複数のサイングループ作成は現在、Plus / Pro機能です。Freeでは1グループまで利用できます。");
    }
    const group = await services.groups.create(teamId, body, auditActorFromAuth(auth));
    return apiJson({ ok: true, group }, 201);
  } catch (error) {
    return serviceErrorResponse(error);
  }
}

export async function teamAdminUpdateGroup(request, env, url, groupId) {
  const parsed = await parseJsonBody(request, groupUpdateBodySchema);
  if (parsed.response) return parsed.response;
  const body = parsed.data;
  const teamId = requestTeamId(body, url);
  const auth = teamId ? await requireTeamAdmin(request, env, teamId) : null;
  if (!teamId || !auth) return apiJson({ error: "unauthorized" }, 401);
  try {
    const group = await createServices(env.DB, env).groups.update(teamId, groupId, body, auditActorFromAuth(auth));
    return apiJson({ ok: true, group });
  } catch (error) {
    return serviceErrorResponse(error);
  }
}

export async function teamAdminDeleteGroup(request, env, url, groupId) {
  const teamId = normalizeTeamId(url.searchParams.get("teamId"));
  const auth = teamId ? await requireTeamAdmin(request, env, teamId) : null;
  if (!teamId || !auth) return apiJson({ error: "unauthorized" }, 401);
  try {
    await createServices(env.DB, env).groups.remove(teamId, groupId, auditActorFromAuth(auth));
    return apiJson({ ok: true });
  } catch (error) {
    return serviceErrorResponse(error);
  }
}

export async function teamAdminCreateSign(request, env, url) {
  const parsed = await parseJsonBody(request, signCreateBodySchema);
  if (parsed.response) return parsed.response;
  const body = parsed.data;
  const teamId = requestTeamId(body, url);
  const auth = teamId ? await requireTeamAdmin(request, env, teamId) : null;
  if (!teamId || !auth) return apiJson({ error: "unauthorized" }, 401);
  try {
    const sign = await createServices(env.DB, env).signs.create(teamId, body, auditActorFromAuth(auth));
    return apiJson({ ok: true, sign }, 201);
  } catch (error) {
    return serviceErrorResponse(error);
  }
}

export async function teamAdminUpdateSign(request, env, url, signId) {
  const parsed = await parseJsonBody(request, signUpdateBodySchema);
  if (parsed.response) return parsed.response;
  const body = parsed.data;
  const teamId = requestTeamId(body, url);
  const auth = teamId ? await requireTeamAdmin(request, env, teamId) : null;
  if (!teamId || !auth) return apiJson({ error: "unauthorized" }, 401);
  try {
    const sign = await createServices(env.DB, env).signs.update(teamId, signId, body, auditActorFromAuth(auth));
    return apiJson({ ok: true, sign });
  } catch (error) {
    return serviceErrorResponse(error);
  }
}

export async function teamAdminDeleteSign(request, env, url, signId) {
  const teamId = normalizeTeamId(url.searchParams.get("teamId"));
  const auth = teamId ? await requireTeamAdmin(request, env, teamId) : null;
  if (!teamId || !auth) return apiJson({ error: "unauthorized" }, 401);
  try {
    await createServices(env.DB, env).signs.remove(teamId, signId, auditActorFromAuth(auth));
    return apiJson({ ok: true });
  } catch (error) {
    return serviceErrorResponse(error);
  }
}

export async function teamAdminCreateVideo(request, env, url, signId) {
  const parsed = await parseJsonBody(request, videoCreateBodySchema);
  if (parsed.response) return parsed.response;
  const body = parsed.data;
  const teamId = requestTeamId(body, url);
  const auth = teamId ? await requireTeamAdmin(request, env, teamId) : null;
  if (!teamId || !auth) return apiJson({ error: "unauthorized" }, 401);
  try {
    const services = createServices(env.DB, env);
    const currentSign = await getSignWithVideos(env.DB, teamId, signId, createDataProtectorFromEnv(env));
    if (!currentSign) return apiJson({ error: "not_found" }, 404);
    if ((currentSign.videoItems || []).length >= 1) {
      await services.entitlements.assertFeature(teamId, FEATURE_KEYS.MULTIPLE_SIGN_VIDEOS, "1つのサインに複数動画を登録する機能は現在、Plus / Pro機能です。Freeでは1サイン1動画まで利用できます。");
    }
    if (Math.max(0, Number(body.thumbnailTimeSeconds) || 0) > 0) {
      await services.entitlements.assertFeature(teamId, FEATURE_KEYS.CUSTOM_VIDEO_THUMBNAIL, "サムネイル確認位置の時間指定は現在、Plus / Pro機能です。");
    }
    const result = await services.videos.create(teamId, signId, body, auditActorFromAuth(auth));
    return apiJson({ ok: true, videoId: result.videoId, sign: result.sign }, 201);
  } catch (error) {
    return serviceErrorResponse(error);
  }
}

export async function teamAdminUpdateVideo(request, env, url, videoId) {
  const parsed = await parseJsonBody(request, videoUpdateBodySchema);
  if (parsed.response) return parsed.response;
  const body = parsed.data;
  const teamId = requestTeamId(body, url);
  const auth = teamId ? await requireTeamAdmin(request, env, teamId) : null;
  if (!teamId || !auth) return apiJson({ error: "unauthorized" }, 401);
  try {
    const services = createServices(env.DB, env);
    if (body.thumbnailTimeSeconds !== undefined && Math.max(0, Number(body.thumbnailTimeSeconds) || 0) > 0) {
      await services.entitlements.assertFeature(teamId, FEATURE_KEYS.CUSTOM_VIDEO_THUMBNAIL, "サムネイル確認位置の時間指定は現在、Plus / Pro機能です。");
    }
    const sign = await services.videos.update(teamId, videoId, body, auditActorFromAuth(auth));
    return apiJson({ ok: true, sign });
  } catch (error) {
    return serviceErrorResponse(error);
  }
}

export async function teamAdminDeleteVideo(request, env, url, videoId) {
  const teamId = normalizeTeamId(url.searchParams.get("teamId"));
  const auth = teamId ? await requireTeamAdmin(request, env, teamId) : null;
  if (!teamId || !auth) return apiJson({ error: "unauthorized" }, 401);
  try {
    const sign = await createServices(env.DB, env).videos.remove(teamId, videoId, auditActorFromAuth(auth));
    return apiJson({ ok: true, sign });
  } catch (error) {
    return serviceErrorResponse(error);
  }
}

export async function teamAdminCreateInvite(request, env, url) {
  const parsed = await parseJsonBody(request, adminInviteBodySchema);
  if (parsed.response) return parsed.response;
  const body = parsed.data;
  const teamId = requestTeamId(body, url);
  const owner = teamId ? await requireTeamOwner(request, env, teamId) : null;
  if (!owner) return apiJson({ error: "owner_required", message: "この操作はメイン管理者のみ実行できます。" }, 403);
  if (body?.kind === "transfer" && !isFreshAccountSession(owner)) return freshAuthRequired(owner, teamId);
  try {
    const services = createServices(env.DB, env);
    if (body?.kind !== "transfer") {
      await services.entitlements.assertFeature(teamId, FEATURE_KEYS.SUB_ADMIN_MANAGEMENT, "サブ管理者の追加は現在、Plus / Pro機能です。");
    }
    const invite = await services.adminMembership.createInvite(teamId, owner.userId, body);
    return apiJson({ ok: true, invite: { ...invite, url: `${url.origin}/join-admin/${encodeURIComponent(invite.rawToken)}` } }, 201);
  } catch (error) { return serviceErrorResponse(error); }
}

export async function teamAdminRevokeInvite(request, env, url, inviteId) {
  const teamId = normalizeTeamId(url.searchParams.get("teamId"));
  const owner = teamId ? await requireTeamOwner(request, env, teamId) : null;
  if (!owner) return apiJson({ error: "owner_required" }, 403);
  try { return apiJson(await createServices(env.DB, env).adminMembership.revokeInvite(teamId, owner.userId, inviteId)); }
  catch (error) { return serviceErrorResponse(error); }
}

export async function teamAdminRemoveAdmin(request, env, url, targetUserId) {
  const teamId = normalizeTeamId(url.searchParams.get("teamId"));
  const owner = teamId ? await requireTeamOwner(request, env, teamId) : null;
  if (!owner) return apiJson({ error: "owner_required" }, 403);
  if (!isFreshAccountSession(owner)) return freshAuthRequired(owner, teamId);
  try { return apiJson(await createServices(env.DB, env).adminMembership.removeAdmin(teamId, owner.userId, targetUserId)); }
  catch (error) { return serviceErrorResponse(error); }
}

export async function teamAdminTransferOwner(request, env, url) {
  const parsed = await parseJsonBody(request, ownerTransferBodySchema);
  if (parsed.response) return parsed.response;
  const body = parsed.data;
  const teamId = requestTeamId(body, url);
  const owner = teamId ? await requireTeamOwner(request, env, teamId) : null;
  if (!owner) return apiJson({ error: "owner_required" }, 403);
  if (!isFreshAccountSession(owner)) return freshAuthRequired(owner, teamId);
  try {
    return apiJson(await createServices(env.DB, env).adminMembership.transferToExisting(teamId, owner.userId, String(body?.nextOwnerUserId || ""), Boolean(body?.currentOwnerExit)));
  } catch (error) { return serviceErrorResponse(error); }
}

export async function teamAdminLeave(request, env, url) {
  const teamId = normalizeTeamId(url.searchParams.get("teamId"));
  const auth = teamId ? await requireTeamAdmin(request, env, teamId) : null;
  if (!auth || auth.authType !== "account") return apiJson({ error: "account_required", message: "アカウント管理者のみ退会できます。" }, 403);
  if (!isFreshAccountSession(auth)) return freshAuthRequired(auth, teamId);
  try { return apiJson(await createServices(env.DB, env).adminMembership.leaveTeam(teamId, auth.userId)); }
  catch (error) { return serviceErrorResponse(error); }
}

export async function teamAdminDisableLegacyPassword(request, env, url) {
  const teamId = normalizeTeamId(url.searchParams.get("teamId"));
  const owner = teamId ? await requireTeamOwner(request, env, teamId) : null;
  if (!owner) return apiJson({ error: "owner_required" }, 403);
  if (!isFreshAccountSession(owner)) return freshAuthRequired(owner, teamId);
  try { return apiJson(await createServices(env.DB, env).adminMembership.disableLegacyPassword(teamId, owner.userId)); }
  catch (error) { return serviceErrorResponse(error); }
}
