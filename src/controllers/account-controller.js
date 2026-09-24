import { OAUTH_COOKIE, USER_COOKIE } from "../config/constants.js";
import { PRIVACY_VERSION, TERMS_VERSION, legalConsentMatches } from "../config/legal.js";
import { serviceErrorResponse } from "../http/errors.js";
import { apiJson, safeJson, withHeaders } from "../http/response.js";
import { createPkcePair, oauthStateValues, redirectUri } from "../oauth/common.js";
import { deauthorizeLineApp, exchangeAndVerifyProvider, OAUTH_PROVIDERS, providerAuthorizationUrl, providerConfigured, providerStatus } from "../oauth/providers.js";
import { requireLegacyTeamAdmin, requireUser } from "../security/authorization.js";
import { enforceRateLimit } from "../security/rate-limit.js";
import { constantTimeEqual } from "../security/encoding.js";
import { cookieValue, createSessionToken, isFreshAccountSession, nowSeconds, readRoleSession, sessionSecretConfigError, verifySessionToken } from "../security/session.js";
import { createServices } from "../services/service-factory.js";
import { normalizeTeamId, positiveNumber } from "../validation/common.js";

const OAUTH_TTL_SECONDS = 10 * 60;

function errorRedirect(url, code) {
  const next = new URL("/account", url.origin);
  next.searchParams.set("authError", String(code || "oauth_failed").slice(0, 80));
  return next.toString();
}

function safeReturnTo(value) {
  const path = String(value || "").trim();
  if (path === "/account") return path;
  if (/^\/t\/[A-Za-z0-9_-]{4,40}\/admin$/.test(path)) return path;
  if (/^\/join-admin\/[A-Za-z0-9_-]{20,200}$/.test(path)) return path;
  return "";
}

function redirectResponse(location, cookies = []) {
  const headers = new Headers({ location, "cache-control": "no-store" });
  for (const cookie of cookies) headers.append("set-cookie", cookie);
  return withHeaders(new Response(null, { status: 302, headers }), { noIndex: true, noCache: true });
}

async function bodyOrError(request) {
  const body = await safeJson(request);
  if (body?.__error === "payload_too_large") return { body: null, response: apiJson({ error: "payload_too_large" }, 413) };
  if (body === null) return { body: null, response: apiJson({ error: "invalid_json" }, 400) };
  return { body: body || {}, response: null };
}

function freshAuthRequired(session, returnTo = "/account") {
  return apiJson({
    error: "reauth_required",
    message: "安全のため、Google / LINEで本人確認をもう一度行ってください。認証後に操作を再実行できます。",
    provider: ["google", "line"].includes(String(session?.provider || "")) ? session.provider : "",
    returnTo
  }, 428);
}

async function userSessionCookie(env, url, user, provider) {
  const maxAge = Math.round(positiveNumber(env.ACCOUNT_SESSION_DAYS, 30) * 86400);
  const now = nowSeconds();
  const token = await createSessionToken({ role: "account", userId: user.id, ver: Number(user.session_version || 1), authAt: now, provider: String(provider || ""), exp: now + maxAge }, env.SESSION_SECRET);
  return cookieValue(USER_COOKIE, token, maxAge, url, "Lax");
}

export async function accountProviders(_request, env) {
  return apiJson({ providers: providerStatus(env) });
}

export async function accountSession(request, env) {
  const configError = sessionSecretConfigError(env);
  if (configError) return apiJson({ authenticated: false, ...configError }, 503);
  const session = await requireUser(request, env);
  if (!session) return apiJson({ authenticated: false });
  try {
    const dashboard = await createServices(env.DB, env).account.dashboard(session.userId);
    return apiJson({ authenticated: true, ...dashboard });
  } catch (error) {
    return serviceErrorResponse(error);
  }
}

export async function accountLogout(_request, env, url) {
  const configError = sessionSecretConfigError(env);
  if (configError) return apiJson(configError, 503);
  return apiJson({ ok: true }, 200, { "set-cookie": cookieValue(USER_COOKIE, "", 0, url, "Lax") });
}

export async function accountOAuthStart(request, env, url, provider) {
  const configError = sessionSecretConfigError(env);
  if (configError) return apiJson(configError, 503);
  if (!OAUTH_PROVIDERS.has(provider)) return apiJson({ error: "provider_not_found" }, 404);
  if (!providerConfigured(provider, env)) return apiJson({ error: "provider_not_configured", message: `${provider === "google" ? "Google" : "LINE"}認証がまだ設定されていません。` }, 503);

  const intent = String(url.searchParams.get("intent") || "login");
  if (!["login", "reauth", "register-team", "claim-team", "invite", "delete-account"].includes(intent)) return apiJson({ error: "invalid_intent" }, 400);
  const teamId = normalizeTeamId(url.searchParams.get("teamId"));
  const inviteToken = String(url.searchParams.get("invite") || "").trim();
  const returnTo = safeReturnTo(url.searchParams.get("returnTo"));
  const legalConsent = legalConsentMatches({
    termsVersion: url.searchParams.get("terms"),
    privacyVersion: url.searchParams.get("privacy")
  });
  if (["login", "register-team", "claim-team", "invite"].includes(intent) && !legalConsent) {
    return apiJson({ error: "legal_consent_required", message: "利用規約とプライバシーポリシーを確認してから続けてください。" }, 400);
  }
  let expectedUserId = "";

  if (intent === "reauth" || intent === "delete-account") {
    const current = await requireUser(request, env);
    if (!current) return apiJson({ error: "unauthorized", message: "本人確認を開始するには管理者アカウントでログインしてください。" }, 401);
    expectedUserId = current.userId;
    if (intent === "delete-account") {
      if (provider !== "line") return apiJson({ error: "line_required", message: "LINE連携の解除にはLINEで本人確認してください。" }, 400);
      const proof = await verifySessionToken(String(url.searchParams.get("proof") || ""), env.SESSION_SECRET);
      if (!proof || proof.role !== "account-delete" || proof.userId !== current.userId || !proof.exp || Number(proof.exp) <= nowSeconds()) {
        return apiJson({ error: "delete_confirmation_required", message: "退会確認からやり直してください。" }, 400);
      }
      try { await createServices(env.DB, env).account.assertAccountDeletable(current.userId); }
      catch (error) { return serviceErrorResponse(error); }
    }
  }

  if (intent === "claim-team") {
    if (!teamId || !(await requireLegacyTeamAdmin(request, env, teamId))) return apiJson({ error: "legacy_admin_required", message: "先に管理者パスワードでチーム管理画面へログインしてください。" }, 401);
  }
  if (intent === "invite") {
    if (!inviteToken || inviteToken.length > 200) return apiJson({ error: "invalid_invite" }, 400);
    try { await createServices(env.DB, env).adminMembership.previewInvite(inviteToken); }
    catch (error) { return serviceErrorResponse(error); }
  }

  const { state, nonce } = oauthStateValues();
  const { verifier, challenge } = await createPkcePair();
  const callback = redirectUri(url.origin, provider);
  const oauthToken = await createSessionToken({
    role: "oauth",
    provider,
    state,
    nonce,
    verifier,
    intent,
    expectedUserId,
    teamId: teamId || "",
    inviteToken: inviteToken || "",
    returnTo,
    termsVersion: legalConsent ? TERMS_VERSION : "",
    privacyVersion: legalConsent ? PRIVACY_VERSION : "",
    exp: nowSeconds() + OAUTH_TTL_SECONDS
  }, env.SESSION_SECRET);
  const cookie = cookieValue(OAUTH_COOKIE, oauthToken, OAUTH_TTL_SECONDS, url, "Lax");
  const location = providerAuthorizationUrl(provider, { env, redirectUri: callback, state, nonce, codeChallenge: challenge });
  return redirectResponse(location, [cookie]);
}

export async function accountOAuthCallback(request, env, url, provider) {
  const clearOauth = cookieValue(OAUTH_COOKIE, "", 0, url, "Lax");
  const configError = sessionSecretConfigError(env);
  if (configError) return redirectResponse(errorRedirect(url, configError.error), [clearOauth]);
  if (!OAUTH_PROVIDERS.has(provider) || !providerConfigured(provider, env)) return redirectResponse(errorRedirect(url, "provider_not_configured"), [clearOauth]);
  if (url.searchParams.get("error")) return redirectResponse(errorRedirect(url, url.searchParams.get("error")), [clearOauth]);

  const oauthSession = await readRoleSession(request, env, OAUTH_COOKIE, "oauth");
  const code = String(url.searchParams.get("code") || "");
  const state = String(url.searchParams.get("state") || "");
  if (!oauthSession || oauthSession.provider !== provider || !code || !state || !constantTimeEqual(String(oauthSession.state || ""), state)) {
    return redirectResponse(errorRedirect(url, "oauth_state_invalid"), [clearOauth]);
  }

  try {
    const profile = await exchangeAndVerifyProvider(provider, {
      env,
      code,
      redirectUri: redirectUri(url.origin, provider),
      codeVerifier: oauthSession.verifier,
      nonce: oauthSession.nonce
    });
    const services = createServices(env.DB, env);
    if (oauthSession.intent === "reauth" || oauthSession.intent === "delete-account") {
      const expectedUserId = String(oauthSession.expectedUserId || "");
      const identity = await services.repositories.userRepository.findByIdentity(provider, profile.subject);
      if (!expectedUserId || !identity || identity.id !== expectedUserId) {
        return redirectResponse(errorRedirect(url, "reauth_identity_mismatch"), [clearOauth]);
      }
    }
    if (oauthSession.intent === "delete-account") {
      const expectedUserId = String(oauthSession.expectedUserId || "");
      await services.account.assertAccountDeletable(expectedUserId);
      await deauthorizeLineApp({ env, userAccessToken: profile.providerAccessToken });
      await services.account.deleteAccount(expectedUserId);
      const clearUser = cookieValue(USER_COOKIE, "", 0, url, "Lax");
      const destination = new URL("/", url.origin);
      destination.searchParams.set("accountDeleted", "1");
      destination.searchParams.set("lineDisconnected", "1");
      return redirectResponse(destination.toString(), [clearOauth, clearUser]);
    }

    const legalConsent = oauthSession.termsVersion && oauthSession.privacyVersion
      ? { termsVersion: oauthSession.termsVersion, privacyVersion: oauthSession.privacyVersion }
      : null;
    const publicUser = await services.account.upsertOAuthUser(profile, legalConsent);
    if (oauthSession.intent === "reauth" && publicUser.id !== oauthSession.expectedUserId) {
      return redirectResponse(errorRedirect(url, "reauth_identity_mismatch"), [clearOauth]);
    }
    const userRow = await services.repositories.userRepository.findById(publicUser.id);
    const loginCookie = await userSessionCookie(env, url, userRow, provider);
    let destination = new URL(oauthSession.returnTo || "/account", url.origin);

    if (oauthSession.intent === "register-team") destination.searchParams.set("create", "1");
    if (oauthSession.intent === "claim-team") {
      await services.adminMembership.claimLegacyTeam(oauthSession.teamId, publicUser.id);
      destination = new URL(`/t/${encodeURIComponent(oauthSession.teamId)}/admin`, url.origin);
      destination.searchParams.set("linked", "1");
    }
    if (oauthSession.intent === "invite") {
      // Authentication and authorization are deliberately separate. After OAuth, send
      // the user back to the invitation page so owner/admin acceptance requires an
      // explicit confirmation click under the authenticated account.
      destination = new URL(`/join-admin/${encodeURIComponent(oauthSession.inviteToken)}`, url.origin);
      destination.searchParams.set("authenticated", "1");
    }
    return redirectResponse(destination.toString(), [clearOauth, loginCookie]);
  } catch (error) {
    console.error("OAuth callback failed", provider, error?.message || error);
    return redirectResponse(errorRedirect(url, "oauth_callback_failed"), [clearOauth]);
  }
}

export async function accountCreateTeam(request, env) {
  const session = await requireUser(request, env);
  if (!session) return apiJson({ error: "unauthorized" }, 401);
  const limited = await enforceRateLimit({
    db: env.DB,
    sessionSecret: env.SESSION_SECRET,
    request,
    scope: "account-team-create",
    identity: session.userId,
    maxAttempts: 10,
    windowSeconds: 24 * 3600
  });
  if (limited) return limited;
  const { body, response } = await bodyOrError(request);
  if (response) return response;
  try {
    const accountService = createServices(env.DB, env).account;
    await accountService.assertLegalConsent(session.userId, TERMS_VERSION, PRIVACY_VERSION);
    const result = await accountService.createTeam(session.userId, body);
    return apiJson({ ok: true, ...result }, 201);
  } catch (error) {
    return serviceErrorResponse(error);
  }
}

export async function accountDelete(request, env, url) {
  const session = await requireUser(request, env);
  if (!session) return apiJson({ error: "unauthorized" }, 401);
  const { body, response } = await bodyOrError(request);
  if (response) return response;
  if (String(body?.confirm || "").trim() !== "退会する") {
    return apiJson({ error: "confirmation_required", message: "確認文字「退会する」を入力してください。" }, 400);
  }
  try {
    const service = createServices(env.DB, env).account;
    const deletable = await service.assertAccountDeletable(session.userId);
    if (deletable.identities.some((identity) => identity.provider === "line")) {
      const proof = await createSessionToken({ role: "account-delete", userId: session.userId, exp: nowSeconds() + OAUTH_TTL_SECONDS }, env.SESSION_SECRET);
      return apiJson({
        error: "line_deauthorization_required",
        message: "退会と同時にLINEの連動アプリ権限を解除します。LINEで本人確認して退会を完了してください。",
        oauthUrl: `/api/account/oauth/line/start?intent=delete-account&proof=${encodeURIComponent(proof)}`
      }, 428);
    }
    if (!isFreshAccountSession(session)) return freshAuthRequired(session, "/account");
    await service.deleteAccount(session.userId);
    return apiJson({ ok: true }, 200, { "set-cookie": cookieValue(USER_COOKIE, "", 0, url, "Lax") });
  } catch (error) {
    return serviceErrorResponse(error);
  }
}

export async function accountInvitePreview(_request, env, rawToken) {
  try {
    const invite = await createServices(env.DB, env).adminMembership.previewInvite(rawToken);
    return apiJson({ invite });
  } catch (error) {
    return serviceErrorResponse(error);
  }
}

export async function accountInviteAccept(request, env, rawToken) {
  const session = await requireUser(request, env);
  if (!session) return apiJson({ error: "unauthorized" }, 401);
  try {
    const service = createServices(env.DB, env).adminMembership;
    const preview = await service.previewInvite(rawToken);
    if (preview.kind === "transfer" && !isFreshAccountSession(session)) {
      return freshAuthRequired(session, `/join-admin/${encodeURIComponent(rawToken)}`);
    }
    const result = await service.acceptInvite(rawToken, session.userId);
    return apiJson({ ok: true, ...result });
  } catch (error) {
    return serviceErrorResponse(error);
  }
}
