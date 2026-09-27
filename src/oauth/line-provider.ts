import { fetchFormJson } from "./common.ts";

const AUTH_URL = "https://access.line.me/oauth2/v2.1/authorize";
const TOKEN_URL = "https://api.line.me/oauth2/v2.1/token";
const VERIFY_URL = "https://api.line.me/oauth2/v2.1/verify";

export function lineConfigured(env) {
  return Boolean(String(env.LINE_CHANNEL_ID || "").trim() && String(env.LINE_CHANNEL_SECRET || "").trim());
}

export function lineAuthorizationUrl({ env, redirectUri, state, nonce, codeChallenge }) {
  const scope = String(env.LINE_REQUEST_EMAIL || "false") === "true" ? "profile openid email" : "profile openid";
  const url = new URL(AUTH_URL);
  url.search = new URLSearchParams({
    response_type: "code",
    client_id: String(env.LINE_CHANNEL_ID),
    redirect_uri: redirectUri,
    state,
    scope,
    nonce,
    code_challenge: codeChallenge,
    code_challenge_method: "S256"
  }).toString();
  return url.toString();
}

export async function exchangeLineCode({ env, code, redirectUri, codeVerifier, fetchFn = fetch }) {
  return fetchFormJson(TOKEN_URL, {
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
    client_id: env.LINE_CHANNEL_ID,
    client_secret: env.LINE_CHANNEL_SECRET,
    code_verifier: codeVerifier
  }, fetchFn);
}

export async function verifyLineIdToken({ env, idToken, nonce, fetchFn = fetch }) {
  const payload = await fetchFormJson(VERIFY_URL, {
    id_token: idToken,
    client_id: env.LINE_CHANNEL_ID,
    nonce
  }, fetchFn);
  if (!payload.sub || String(payload.aud) !== String(env.LINE_CHANNEL_ID)) throw new Error("line_id_token_invalid");
  return {
    provider: "line",
    subject: String(payload.sub),
    displayName: String(payload.name || payload.email || "LINEユーザー").slice(0, 120),
    email: String(payload.email || "").slice(0, 254),
    emailVerified: Boolean(payload.email),
    avatarUrl: String(payload.picture || "").slice(0, 1000)
  };
}

const STATELESS_CHANNEL_TOKEN_URL = "https://api.line.me/oauth2/v3/token";
const DEAUTHORIZE_URL = "https://api.line.me/user/v1/deauthorize";

export async function deauthorizeLineApp({ env, userAccessToken, fetchFn = fetch }) {
  const tokenPayload = await fetchFormJson(STATELESS_CHANNEL_TOKEN_URL, {
    grant_type: "client_credentials",
    client_id: env.LINE_CHANNEL_ID,
    client_secret: env.LINE_CHANNEL_SECRET
  }, fetchFn);
  const channelAccessToken = String(tokenPayload?.access_token || "");
  if (!channelAccessToken) throw new Error("line_channel_token_missing");

  const response = await fetchFn(DEAUTHORIZE_URL, {
    method: "POST",
    headers: {
      authorization: `Bearer ${channelAccessToken}`,
      "content-type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({ userAccessToken: String(userAccessToken || "") }).toString()
  });
  if (response.status !== 204) {
    const detail = await response.text().catch(() => "");
    throw new Error(`line_deauthorize_failed:${response.status}:${detail.slice(0, 120)}`);
  }
}
