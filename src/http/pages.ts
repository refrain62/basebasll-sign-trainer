import { withHeaders } from "./response.ts";
import { applyAssetVersion } from "./versioned-assets.ts";

export function pageAssetForPath(pathname) {
  const clean = pathname.replace(/\/$/, "") || "/";
  if (clean === "/" || clean === "/index.html") return "/__pages/index.txt";
  if (clean === "/plans" || clean === "/plans.html") return "/__pages/plans.txt";
  if (clean === "/install" || clean === "/install.html") return "/__pages/install.txt";
  if (clean === "/register" || clean === "/admin.html" || /^\/admin(?:\/(?:teams|security|notices))?$/.test(clean)) return "/__pages/admin.txt";
  if (clean === "/account" || clean === "/account.html" || /^\/join-admin\/[^/]+$/.test(clean)) return "/__pages/account.txt";
  if (clean === "/terms" || clean === "/terms.html") return "/__pages/terms.txt";
  if (clean === "/privacy" || clean === "/privacy.html") return "/__pages/privacy.txt";
  if (clean === "/external-transmission" || clean === "/external-transmission.html") return "/__pages/external-transmission.txt";
  if (clean === "/support" || clean === "/support.html") return "/__pages/support.txt";
  if (clean === "/team.html") return "/__pages/team.txt";
  if (/^\/t\/[^/]+\/admin(?:\/(?:activity|groups|signs|share|admins|plan-auth|notices|settings))?$/.test(clean)) return "/__pages/admin.txt";
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
  headers.delete("etag");
  headers.delete("last-modified");
  const html = applyAssetVersion(await assetResponse.text(), env);
  return withHeaders(new Response(html, { status: 200, headers }), {
    noIndex: !["/", "/index.html", "/plans", "/plans.html", "/install", "/install.html"].includes(url.pathname),
    noCache: true
  });
}
