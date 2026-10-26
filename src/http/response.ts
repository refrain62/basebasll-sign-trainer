import { MAX_JSON_BYTES } from "../config/constants.ts";

const decoder = new TextDecoder();

async function readJsonText(request) {
  if (!request.body) return "";
  const reader = request.body.getReader();
  const chunks = [];
  let totalBytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.byteLength;
      if (totalBytes > MAX_JSON_BYTES) {
        await reader.cancel();
        return { __error: "payload_too_large" };
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return decoder.decode(bytes);
}

export async function safeJson(request) {
  try {
    const len = Number(request.headers.get("content-length") || 0);
    if (len > MAX_JSON_BYTES) return { __error: "payload_too_large" };
    const text = await readJsonText(request);
    if (text && typeof text === "object" && text.__error === "payload_too_large") return text;
    return text ? JSON.parse(String(text)) : {};
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
