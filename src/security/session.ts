import { isAdminCredential, isStrongSecret, normalizeSecret } from "../validation/common.ts";
import { base64UrlDecode, base64UrlEncode, constantTimeBytes, decoder, encoder } from "./encoding.ts";

export function sessionSecretConfigError(env) {
  if (isStrongSecret(env.SESSION_SECRET, 32)) return null;
  return {
    error: "session_secret_not_configured",
    message: "SESSION_SECRET が未設定、または32文字未満です。サーバー設定を確認してください。"
  };
}

export function systemAdminSecretConfigError(env) {
  if (isAdminCredential(env.SYSTEM_ADMIN_SECRET)) return null;
  return {
    error: "system_admin_secret_not_configured",
    message: "SYSTEM_ADMIN_SECRET は12文字以上で、英字と数字をそれぞれ1文字以上含めて設定してください。"
  };
}

export function nowSeconds() {
  return Math.floor(Date.now() / 1000);
}

export function isLocalHostname(hostname) {
  return ["localhost", "127.0.0.1", "::1"].includes(String(hostname).toLowerCase());
}

export function parseCookies(header) {
  return Object.fromEntries(String(header || "").split(";").map((p) => p.trim()).filter(Boolean).map((p) => {
    const i = p.indexOf("=");
    return i === -1 ? [p, ""] : [p.slice(0, i), p.slice(i + 1)];
  }));
}

export function cookieValue(name, value, maxAge, url, sameSite = "Lax") {
  const isLocal = isLocalHostname(url.hostname);
  const actualName = isLocal ? name : `__Host-${name}`;
  return [`${actualName}=${value}`, "Path=/", "HttpOnly", `SameSite=${sameSite}`, `Max-Age=${Math.max(0, maxAge)}`, ...(isLocal ? [] : ["Secure"])].join("; ");
}

async function sign(message, secret) {
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(message));
  return base64UrlEncode(new Uint8Array(signature));
}

export async function createSessionToken(payload, secret) {
  if (!isStrongSecret(secret, 32)) throw new Error("SESSION_SECRET is not configured safely");
  const body = base64UrlEncode(encoder.encode(JSON.stringify(payload)));
  return `${body}.${await sign(body, secret)}`;
}

export async function verifySessionToken(token, secret) {
  if (!token || !isStrongSecret(secret, 32)) return null;
  const [body, signature, extra] = String(token).split(".");
  if (!body || !signature || extra) return null;
  const expected = await sign(body, secret);
  if (!constantTimeBytes(encoder.encode(signature), encoder.encode(expected))) return null;
  try {
    return JSON.parse(decoder.decode(base64UrlDecode(body)));
  } catch {
    return null;
  }
}

export async function readRoleSession(request, env, cookieName, role) {
  if (!isStrongSecret(env.SESSION_SECRET, 32)) return null;
  const url = new URL(request.url);
  const actualName = isLocalHostname(url.hostname) ? cookieName : `__Host-${cookieName}`;
  const token = parseCookies(request.headers.get("cookie") || "")[actualName];
  if (!token) return null;
  const payload = await verifySessionToken(token, env.SESSION_SECRET);
  if (!payload || payload.role !== role || !payload.exp || payload.exp <= nowSeconds()) return null;
  return payload;
}

export function isFreshAccountSession(session, maxAgeSeconds = 10 * 60, now = nowSeconds()) {
  const authAt = Number(session?.authAt || 0);
  return Boolean(session?.userId && Number.isFinite(authAt) && authAt > 0 && now - authAt >= 0 && now - authAt <= maxAgeSeconds);
}

export async function systemSecretVersion(secret) {
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(normalizeSecret(secret))));
  return base64UrlEncode(digest).slice(0, 16);
}
