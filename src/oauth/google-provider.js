import { decodeJwt, fetchFormJson, validateOidcClaims } from "./common.js";
import { encoder } from "../security/encoding.js";

const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const JWKS_URL = "https://www.googleapis.com/oauth2/v3/certs";
let jwksCache = { expiresAt: 0, keys: [] };

export function googleConfigured(env) {
  return Boolean(String(env.GOOGLE_CLIENT_ID || "").trim() && String(env.GOOGLE_CLIENT_SECRET || "").trim());
}

export function googleAuthorizationUrl({ env, redirectUri, state, nonce, codeChallenge }) {
  const url = new URL(AUTH_URL);
  url.search = new URLSearchParams({
    client_id: String(env.GOOGLE_CLIENT_ID),
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    state,
    nonce,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
    prompt: "select_account"
  }).toString();
  return url.toString();
}

export async function exchangeGoogleCode({ env, code, redirectUri, codeVerifier, fetchFn = fetch }) {
  return fetchFormJson(TOKEN_URL, {
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
    client_id: env.GOOGLE_CLIENT_ID,
    client_secret: env.GOOGLE_CLIENT_SECRET,
    code_verifier: codeVerifier
  }, fetchFn);
}

function cacheSeconds(header) {
  const match = String(header || "").match(/max-age=(\d+)/i);
  return match ? Math.max(60, Math.min(Number(match[1]), 24 * 3600)) : 3600;
}

async function googleKeys(fetchFn) {
  const now = Date.now();
  if (jwksCache.keys.length && jwksCache.expiresAt > now) return jwksCache.keys;
  const response = await fetchFn(JWKS_URL, { headers: { accept: "application/json" } });
  if (!response.ok) throw new Error("google_jwks_unavailable");
  const body = await response.json();
  const keys = Array.isArray(body.keys) ? body.keys : [];
  if (!keys.length) throw new Error("google_jwks_empty");
  jwksCache = { keys, expiresAt: now + cacheSeconds(response.headers.get("cache-control")) * 1000 };
  return keys;
}

export async function verifyGoogleIdToken({ env, idToken, nonce, fetchFn = fetch }) {
  const jwt = decodeJwt(idToken);
  if (jwt.header.alg !== "RS256" || !jwt.header.kid) throw new Error("google_jwt_header_invalid");
  let keys = await googleKeys(fetchFn);
  let jwk = keys.find((item) => item.kid === jwt.header.kid);
  if (!jwk) {
    jwksCache.expiresAt = 0;
    keys = await googleKeys(fetchFn);
    jwk = keys.find((item) => item.kid === jwt.header.kid);
  }
  if (!jwk) throw new Error("google_jwk_not_found");
  const key = await crypto.subtle.importKey("jwk", jwk, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]);
  const valid = await crypto.subtle.verify("RSASSA-PKCS1-v1_5", key, jwt.signature, encoder.encode(jwt.signingInput));
  if (!valid) throw new Error("google_jwt_signature_invalid");
  const payload = validateOidcClaims(jwt.payload, {
    audience: String(env.GOOGLE_CLIENT_ID),
    nonce,
    issuers: ["https://accounts.google.com", "accounts.google.com"]
  });
  return {
    provider: "google",
    subject: String(payload.sub),
    displayName: String(payload.name || payload.email || "Googleユーザー").slice(0, 120),
    email: String(payload.email || "").slice(0, 254),
    emailVerified: payload.email_verified === true || payload.email_verified === "true",
    avatarUrl: String(payload.picture || "").slice(0, 1000)
  };
}
