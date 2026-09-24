import { withHeaders } from "./response.js";

export function pageAssetForPath(pathname) {
  const clean = pathname.replace(/\/$/, "") || "/";
  if (clean === "/") return "/__pages/index.txt";
  if (clean === "/admin" || clean === "/register") return "/__pages/admin.txt";
  if (/^\/t\/[^/]+\/admin$/.test(clean)) return "/__pages/admin.txt";
  if (/^\/t\/[^/]+$/.test(clean)) return "/__pages/team.txt";
  return null;
}

export async function serveHtmlPage(request, env, url, assetPath) {
  const assetUrl = new URL(assetPath, url.origin);
  const assetRequest = new Request(assetUrl, { method: "GET", headers: request.headers });
  const assetResponse = await env.ASSETS.fetch(assetRequest);

  if (!assetResponse.ok) {
    console.error("SIGN TRAINER page asset error", {
      route: url.pathname,
      assetPath,
      status: assetResponse.status,
      location: assetResponse.headers.get("location")
    });
    return new Response("ページを読み込めませんでした。", { status: 500 });
  }

  const headers = new Headers(assetResponse.headers);
  headers.set("content-type", "text/html; charset=UTF-8");
  headers.delete("location");
  headers.delete("content-length");
  return withHeaders(new Response(assetResponse.body, { status: 200, headers }), {
    noIndex: url.pathname !== "/",
    noCache: true
  });
}
