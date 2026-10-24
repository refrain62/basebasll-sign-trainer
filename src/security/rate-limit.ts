import { apiJson } from "../http/response.ts";
import { base64UrlEncode, encoder } from "./encoding.ts";
import { nowSeconds } from "./session.ts";

let lastPruneAt = 0;

async function keyedHash(value, secret) {
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(value)));
  return base64UrlEncode(sig).slice(0, 32);
}

function clientIp(request) {
  return request.headers.get("cf-connecting-ip") || "local";
}


async function maybePruneRateLimits(db, now) {
  if (now - lastPruneAt < 3600) return;
  lastPruneAt = now;
  try {
    await db.prepare("DELETE FROM auth_rate_limits WHERE window_start < ?").bind(now - 7 * 24 * 3600).run();
  } catch (error) {
    console.warn("rate-limit cleanup failed", error?.message || error);
  }
}

function limiterKey(request, scope, identity, secret) {
  return keyedHash(`${scope}|${identity}|${clientIp(request)}`, secret).then((hash) => `${scope}:${hash}`);
}

export async function enforceRateLimit({ db, sessionSecret, request, scope, identity, maxAttempts, windowSeconds }) {
  const key = await limiterKey(request, scope, identity, sessionSecret || "local");
  const now = nowSeconds();
  await maybePruneRateLimits(db, now);
  // 認証試行回数の加算を1つのSQLite文で行う。読取と更新を分けると、
  // 並列試行が同じ回数を読み互いに上書きするため、レート制限を回避できる。
  const row = await db.prepare(`
    INSERT INTO auth_rate_limits(key,window_start,count) VALUES(?,?,1)
    ON CONFLICT(key) DO UPDATE SET
      window_start=CASE WHEN auth_rate_limits.window_start <= ? THEN excluded.window_start ELSE auth_rate_limits.window_start END,
      count=CASE WHEN auth_rate_limits.window_start <= ? THEN 1 ELSE auth_rate_limits.count + 1 END
    RETURNING window_start,count
  `).bind(key, now, now - windowSeconds, now - windowSeconds).first();
  const count = Number(row?.count || 1);
  const windowStart = Number(row?.window_start || now);
  if (count > maxAttempts) {
    const retryAfter = Math.max(1, windowSeconds - (now - windowStart));
    return apiJson({ error: "rate_limited", message: "試行回数が多すぎます。しばらく待ってからお試しください。" }, 429, { "retry-after": String(retryAfter) });
  }
  return null;
}

export async function clearRateLimit({ db, sessionSecret, request, scope, identity }) {
  const key = await limiterKey(request, scope, identity, sessionSecret || "local");
  await db.prepare("DELETE FROM auth_rate_limits WHERE key=?").bind(key).run();
}
