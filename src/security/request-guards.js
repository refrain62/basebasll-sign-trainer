import { apiJson, withHeaders } from "../http/response.js";
import { isLocalHostname } from "./session.js";
import { verifyCloudflareAccessJwt } from "./cloudflare-access.js";

export { isLocalHostname };

export function isSystemAdminPath(pathname) {
  return pathname === "/admin" || pathname === "/register" || pathname.startsWith("/api/system/");
}

export async function validateCloudflareAccess(request, env, { fetcher = fetch, nowSeconds } = {}) {
  const assertion = request.headers.get("cf-access-jwt-assertion") || "";
  if (!assertion) {
    return withHeaders(new Response("System admin is protected by Cloudflare Access.", { status: 403 }), { noIndex: true, noCache: true });
  }
  let payload;
  try {
    payload = await verifyCloudflareAccessJwt(assertion, {
      teamDomain: env.CF_ACCESS_TEAM_DOMAIN,
      policyAud: env.CF_ACCESS_POLICY_AUD,
      fetcher,
      ...(nowSeconds === undefined ? {} : { nowSeconds })
    });
  } catch (error) {
    console.warn("Cloudflare Access JWT validation failed", error?.message || error);
    return withHeaders(new Response("Cloudflare Access token validation failed.", { status: 403 }), { noIndex: true, noCache: true });
  }
  const email = String(payload?.email || "").trim().toLowerCase();
  if (!email) {
    return withHeaders(new Response("Cloudflare Access identity is missing an email claim.", { status: 403 }), { noIndex: true, noCache: true });
  }
  const allowed = String(env.SYSTEM_ADMIN_ALLOWED_EMAILS || "").split(",").map((v) => v.trim().toLowerCase()).filter(Boolean);
  if (allowed.length && !allowed.includes(email)) {
    return withHeaders(new Response("Access denied.", { status: 403 }), { noIndex: true, noCache: true });
  }
  return null;
}

export function validateMutationRequest(request, url) {
  const origin = request.headers.get("origin");
  if (!origin || origin !== url.origin) return apiJson({ error: "csrf_blocked", message: "不正な送信元からのリクエストを拒否しました。" }, 403);
  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite && fetchSite !== "same-origin") return apiJson({ error: "csrf_blocked" }, 403);
  const contentType = request.headers.get("content-type") || "";
  if (contentType && !contentType.toLowerCase().startsWith("application/json")) return apiJson({ error: "unsupported_media_type", message: "JSON形式で送信してください。" }, 415);
  return null;
}
