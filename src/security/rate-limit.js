import { apiJson } from "../http/response.js";
import { base64UrlEncode, encoder } from "./encoding.js";
import { nowSeconds } from "./session.js";

async function keyedHash(value, secret) {
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(value)));
  return base64UrlEncode(sig).slice(0, 32);
}

function clientIp(request) {
  return request.headers.get("cf-connecting-ip") || request.headers.get("x-forwarded-for") || "local";
}

function limiterKey(request, scope, identity, secret) {
  return keyedHash(`${scope}|${identity}|${clientIp(request)}`, secret).then((hash) => `${scope}:${hash}`);
}

export async function enforceRateLimit({ db, sessionSecret, request, scope, identity, maxAttempts, windowSeconds }) {
  const key = await limiterKey(request, scope, identity, sessionSecret || "local");
  const now = nowSeconds();
  const row = await db.prepare("SELECT window_start,count FROM auth_rate_limits WHERE key=?").bind(key).first();
  if (!row || now - Number(row.window_start) >= windowSeconds) {
    await db.prepare("INSERT INTO auth_rate_limits(key,window_start,count) VALUES(?,?,1) ON CONFLICT(key) DO UPDATE SET window_start=excluded.window_start,count=1").bind(key, now).run();
    return null;
  }
  const next = Number(row.count || 0) + 1;
  await db.prepare("UPDATE auth_rate_limits SET count=? WHERE key=?").bind(next, key).run();
  if (next > maxAttempts) {
    const retryAfter = Math.max(1, windowSeconds - (now - Number(row.window_start)));
    return apiJson({ error: "rate_limited", message: "試行回数が多すぎます。しばらく待ってからお試しください。" }, 429, { "retry-after": String(retryAfter) });
  }
  return null;
}

export async function clearRateLimit({ db, sessionSecret, request, scope, identity }) {
  const key = await limiterKey(request, scope, identity, sessionSecret || "local");
  await db.prepare("DELETE FROM auth_rate_limits WHERE key=?").bind(key).run();
}
