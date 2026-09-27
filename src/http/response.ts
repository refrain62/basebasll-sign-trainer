import { MAX_JSON_BYTES } from "../config/constants.ts";

const encoder = new TextEncoder();

export async function safeJson(request) {
  try {
    const len = Number(request.headers.get("content-length") || 0);
    if (len > MAX_JSON_BYTES) return { __error: "payload_too_large" };
    const text = await request.text();
    if (encoder.encode(text).byteLength > MAX_JSON_BYTES) return { __error: "payload_too_large" };
    return text ? JSON.parse(text) : {};
  } catch {
    return null;
  }
}

export function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", ...headers }
  });
}

export function apiJson(data, status = 200, extraHeaders = {}) {
  return withHeaders(json(data, status, { "cache-control": "no-store", ...extraHeaders }), { noIndex: true });
}

export function withHeaders(response, { noIndex = false, noCache = false } = {}) {
  const headers = new Headers(response.headers);
  headers.set("x-content-type-options", "nosniff");
  headers.set("referrer-policy", "strict-origin-when-cross-origin");
  headers.set("permissions-policy", "camera=(), microphone=(), geolocation=(), payment=(), usb=()");
  headers.set("cross-origin-opener-policy", "same-origin-allow-popups");
  headers.set("x-frame-options", "DENY");
  headers.set("content-security-policy", "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data: https://i.ytimg.com; frame-src https://www.youtube-nocookie.com; connect-src 'self'; media-src 'self'; font-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'");
  if (noIndex) headers.set("x-robots-tag", "noindex, nofollow, noarchive");
  if (noCache) headers.set("cache-control", "no-cache, no-store, must-revalidate");
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}
