import { apiJson, withHeaders } from "../http/response.js";
import { isLocalHostname } from "./session.js";

export { isLocalHostname };

export function isSystemAdminPath(pathname) {
  return pathname === "/admin" || pathname === "/register" || pathname.startsWith("/api/system/");
}

export function validateCloudflareAccess(request, env) {
  const email = (request.headers.get("cf-access-authenticated-user-email") || "").trim().toLowerCase();
  const assertion = request.headers.get("cf-access-jwt-assertion") || "";
  if (!email || !assertion) {
    return withHeaders(new Response("System admin is protected by Cloudflare Access.", { status: 403 }), { noIndex: true, noCache: true });
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
