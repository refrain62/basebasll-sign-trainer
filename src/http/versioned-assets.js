import { withHeaders } from "./response.js";

export const ASSET_VERSION_TOKEN = "__ASSET_VERSION__";

export function assetVersion(env = {}) {
  const versionId = String(env?.CF_VERSION_METADATA?.id || "").trim();
  if (versionId) return encodeURIComponent(versionId.slice(0, 128));
  const versionTag = String(env?.CF_VERSION_METADATA?.tag || "").trim();
  if (versionTag) return encodeURIComponent(versionTag.slice(0, 128));
  return "dev";
}

export function applyAssetVersion(text, env = {}) {
  return String(text ?? "").replaceAll(ASSET_VERSION_TOKEN, assetVersion(env));
}

export function isVersionedTextAsset(pathname) {
  return /\.(?:js|css|webmanifest)$/i.test(String(pathname || ""));
}

export async function serveVersionedTextAsset(request, env) {
  const assetResponse = await env.ASSETS.fetch(request);
  if (!assetResponse.ok) return withHeaders(assetResponse);

  const headers = new Headers(assetResponse.headers);
  headers.delete("content-length");
  headers.delete("etag");
  headers.delete("last-modified");

  const body = applyAssetVersion(await assetResponse.text(), env);
  return withHeaders(new Response(body, {
    status: assetResponse.status,
    statusText: assetResponse.statusText,
    headers
  }), { noCache: true });
}
