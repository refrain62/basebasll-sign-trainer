import { withHeaders } from "./response.ts";

export const ASSET_VERSION_TOKEN = "__ASSET_VERSION__";

export function assetVersion(env: Record<string, unknown> = {}): string {
  const metadata = (env?.CF_VERSION_METADATA || {}) as { id?: unknown; tag?: unknown };
  const versionId = String(metadata.id || "").trim();
  if (versionId) return encodeURIComponent(versionId.slice(0, 128));
  const versionTag = String(metadata.tag || "").trim();
  if (versionTag) return encodeURIComponent(versionTag.slice(0, 128));
  return "dev";
}

export function applyAssetVersion(text: unknown, env: Record<string, unknown> = {}): string {
  return String(text ?? "").replaceAll(ASSET_VERSION_TOKEN, assetVersion(env));
}

export function isVersionedTextAsset(pathname: unknown): boolean {
  return /\.(?:css|webmanifest)$/i.test(String(pathname || ""));
}

export async function serveVersionedTextAsset(request: Request, env: any): Promise<Response> {
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
