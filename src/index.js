import { getSigns } from "./signs.js";

const encoder = new TextEncoder();
const decoder = new TextDecoder();
const SESSION_COOKIE = "st_session";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    try {
      if (url.pathname.startsWith("/api/")) {
        return await handleApi(request, env, url);
      }

      if (url.pathname.startsWith("/t/") && url.pathname !== `/t/${env.TEAM_ID}`) {
        return withHeaders(
          new Response(renderNotFound(), {
            status: 404,
            headers: { "content-type": "text/html; charset=utf-8" }
          }),
          { noIndex: true }
        );
      }

      let assetRequest = request;
      if (url.pathname === `/t/${env.TEAM_ID}` || url.pathname === `/t/${env.TEAM_ID}/`) {
        const assetUrl = new URL("/index.html", url.origin);
        assetRequest = new Request(assetUrl, request);
      }

      const response = await env.ASSETS.fetch(assetRequest);
      return withHeaders(response, { noIndex: url.pathname.startsWith("/t/") });
    } catch (error) {
      console.error(error);
      return withHeaders(
        json({ error: "server_error", message: "サーバーでエラーが発生しました。" }, 500),
        { noIndex: true }
      );
    }
  }
};

async function handleApi(request, env, url) {
  const method = request.method.toUpperCase();

  if (url.pathname === "/api/session" && method === "GET") {
    const session = await readSession(request, env);
    return apiJson({
      authenticated: Boolean(session),
      teamId: env.TEAM_ID,
      teamName: env.TEAM_NAME
    });
  }

  if (url.pathname === "/api/auth" && method === "POST") {
    if (!env.TEAM_PASSPHRASE || !env.SESSION_SECRET) {
      return apiJson(
        { error: "server_not_configured", message: "現在、認証設定の準備中です。管理者にお知らせください。" },
        503
      );
    }

    const body = await safeJson(request);
    const passphrase = typeof body?.passphrase === "string" ? body.passphrase.trim().normalize("NFC") : "";
    const expectedPassphrase = typeof env.TEAM_PASSPHRASE === "string"
      ? env.TEAM_PASSPHRASE.trim().normalize("NFC")
      : "";

    if (!passphrase || !expectedPassphrase || !constantTimeEqual(passphrase, expectedPassphrase)) {
      return apiJson(
        { error: "invalid_passphrase", message: "合言葉が違うようです。" },
        401
      );
    }

    const days = positiveNumber(env.SESSION_DAYS, 30);
    const maxAge = Math.round(days * 24 * 60 * 60);
    const token = await createSessionToken(
      {
        teamId: env.TEAM_ID,
        exp: Math.floor(Date.now() / 1000) + maxAge
      },
      env.SESSION_SECRET
    );

    const isLocal = ["localhost", "127.0.0.1"].includes(url.hostname);
    const cookie = [
      `${SESSION_COOKIE}=${token}`,
      "Path=/",
      "HttpOnly",
      "SameSite=Lax",
      `Max-Age=${maxAge}`,
      ...(isLocal ? [] : ["Secure"])
    ].join("; ");

    return apiJson(
      { ok: true, teamId: env.TEAM_ID, teamName: env.TEAM_NAME },
      200,
      { "set-cookie": cookie }
    );
  }

  if (url.pathname === "/api/logout" && method === "POST") {
    const isLocal = ["localhost", "127.0.0.1"].includes(url.hostname);
    const cookie = [
      `${SESSION_COOKIE}=`,
      "Path=/",
      "HttpOnly",
      "SameSite=Lax",
      "Max-Age=0",
      ...(isLocal ? [] : ["Secure"])
    ].join("; ");

    return apiJson({ ok: true }, 200, { "set-cookie": cookie });
  }

  if (url.pathname === "/api/signs" && method === "GET") {
    const session = await readSession(request, env);
    if (!session) {
      return apiJson({ error: "unauthorized", message: "合言葉を入力してください。" }, 401);
    }

    return apiJson({
      team: {
        id: env.TEAM_ID,
        name: env.TEAM_NAME
      },
      signs: getSigns(env)
    });
  }

  return apiJson({ error: "not_found" }, 404);
}

async function readSession(request, env) {
  if (!env.SESSION_SECRET) return null;

  const cookies = parseCookies(request.headers.get("cookie") || "");
  const token = cookies[SESSION_COOKIE];
  if (!token) return null;

  const payload = await verifySessionToken(token, env.SESSION_SECRET);
  if (!payload || payload.teamId !== env.TEAM_ID) return null;
  if (!payload.exp || payload.exp <= Math.floor(Date.now() / 1000)) return null;
  return payload;
}

async function createSessionToken(payload, secret) {
  const encodedPayload = base64UrlEncode(encoder.encode(JSON.stringify(payload)));
  const signature = await sign(encodedPayload, secret);
  return `${encodedPayload}.${signature}`;
}

async function verifySessionToken(token, secret) {
  const [payloadPart, signaturePart, extra] = token.split(".");
  if (!payloadPart || !signaturePart || extra) return null;

  const expected = await sign(payloadPart, secret);
  if (!constantTimeEqual(signaturePart, expected)) return null;

  try {
    return JSON.parse(decoder.decode(base64UrlDecode(payloadPart)));
  } catch {
    return null;
  }
}

async function sign(message, secret) {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(message));
  return base64UrlEncode(new Uint8Array(signature));
}

function base64UrlEncode(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

function base64UrlDecode(value) {
  let normalized = value.replaceAll("-", "+").replaceAll("_", "/");
  while (normalized.length % 4) normalized += "=";
  const binary = atob(normalized);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

function parseCookies(header) {
  return Object.fromEntries(
    header
      .split(";")
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const index = part.indexOf("=");
        return index === -1 ? [part, ""] : [part.slice(0, index), part.slice(index + 1)];
      })
  );
}

function constantTimeEqual(a, b) {
  if (typeof a !== "string" || typeof b !== "string") return false;
  let mismatch = a.length ^ b.length;
  const length = Math.max(a.length, b.length);
  for (let index = 0; index < length; index += 1) {
    mismatch |= (a.charCodeAt(index) || 0) ^ (b.charCodeAt(index) || 0);
  }
  return mismatch === 0;
}

async function safeJson(request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

function positiveNumber(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : fallback;
}

function apiJson(data, status = 200, extraHeaders = {}) {
  return withHeaders(
    json(data, status, {
      "cache-control": "no-store",
      ...extraHeaders
    }),
    { noIndex: true }
  );
}

function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...headers
    }
  });
}

function withHeaders(response, { noIndex = false } = {}) {
  const headers = new Headers(response.headers);
  headers.set("x-content-type-options", "nosniff");
  headers.set("referrer-policy", "strict-origin-when-cross-origin");
  headers.set("permissions-policy", "camera=(), microphone=(), geolocation=()");
  headers.set("cross-origin-opener-policy", "same-origin-allow-popups");
  headers.set(
    "content-security-policy",
    "default-src 'self'; script-src 'self' https://www.youtube.com; style-src 'self'; img-src 'self' data: https:; frame-src https://www.youtube.com https://www.youtube-nocookie.com; connect-src 'self' https://www.youtube.com https://www.youtube-nocookie.com; media-src 'self' https:; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'"
  );
  if (noIndex) headers.set("x-robots-tag", "noindex, nofollow, noarchive");

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

function renderNotFound() {
  return `<!doctype html>
<html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>チームが見つかりません | SIGN TRAINER</title><style>body{font-family:system-ui,sans-serif;background:#f4f7f9;color:#0d2945;margin:0;display:grid;min-height:100vh;place-items:center}.box{max-width:420px;background:#fff;border:1px solid #dbe4ea;border-radius:24px;padding:32px;text-align:center;box-shadow:0 18px 50px rgba(13,41,69,.08)}a{color:#087a4b}</style></head><body><main class="box"><h1>チームが見つかりません</h1><p>URLが正しいか確認してください。</p><a href="/">トップページへ</a></main></body></html>`;
}
