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
  if (clean === "/legal" || clean === "/legal.html") return "/__pages/legal.txt";
  if (clean === "/contact" || clean === "/contact.html") return "/__pages/contact.txt";
  if (clean === "/support" || clean === "/support.html") return "/__pages/support.txt";
  if (clean === "/team.html") return "/__pages/team.txt";
  if (/^\/t\/[^/]+\/admin(?:\/(?:activity|groups|signs|share|admins|plan-auth|notices|settings))?$/.test(clean)) return "/__pages/admin.txt";
  if (/^\/t\/[^/]+$/.test(clean)) return "/__pages/team.txt";
  return null;
}

export function teamManifestUrlForPath(pathname: string) {
  const clean = String(pathname || "").replace(/\/$/, "");
  const match = clean.match(/^\/t\/([A-Za-z0-9_-]+)$/);
  return match ? `/pwa/team/${encodeURIComponent(match[1])}/manifest.webmanifest` : "";
}

export function applyTeamManifestLink(html: string, pathname: string) {
  const manifestUrl = teamManifestUrlForPath(pathname);
  if (!manifestUrl) return html;
  const manifestTag = `<link rel="manifest" href="${manifestUrl}" />`;
  if (/<link\s+rel=["']manifest["'][^>]*>/i.test(html)) {
    return html.replace(/<link\s+rel=["']manifest["'][^>]*>/i, manifestTag);
  }
  return html.replace("</head>", `  ${manifestTag}\n  </head>`);
}

function environmentContext(url, env) {
  const configured = String(env?.ENVIRONMENT || "dev").trim().toLowerCase();
  const host = String(url?.hostname || "").toLowerCase();
  const local = host === "127.0.0.1" || host === "localhost" || host === "0.0.0.0";
  if (!local && configured === "production") return null;
  if (local) return { key: "local", label: "LOCAL 環境", note: "ローカル環境です。本番ではありません" };
  if (configured === "staging") return { key: "staging", label: "STAGING 環境", note: "検証環境です。本番ではありません" };
  return { key: "dev", label: "DEV 環境", note: "開発環境です。本番ではありません" };
}

function applyEnvironmentContext(html, env, url) {
  const context = environmentContext(url, env);
  if (!context) return html;
  const badge = `<button class="environment-context-badge environment-context-badge--${context.key}" type="button" data-environment-context-badge aria-label="${context.label}。${context.note}。操作先を確認して、クリックで閉じる"><span class="environment-context-close" aria-hidden="true">×</span><strong>${context.label}</strong><span>${context.note}</span><small>操作先を確認してクリックで閉じる</small></button>`;
  return String(html).replace(/<body([^>]*)>/i, `<body$1>${badge}`);
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
  const html = applyTeamManifestLink(applyAssetVersion(applyEnvironmentContext(await assetResponse.text(), env, url), env), url.pathname);
  return withHeaders(new Response(html, { status: 200, headers }), {
    noIndex: !["/", "/index.html", "/plans", "/plans.html", "/install", "/install.html"].includes(url.pathname),
    noCache: true
  });
}
