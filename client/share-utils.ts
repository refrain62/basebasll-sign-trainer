// Source of truth: TypeScript. Vite generates content-hashed browser bundles under public/build/.
import { createQrSvgDataUrl } from "./qr-code";

export const APP_ORIGIN = window.location.origin.replace(/\/$/, "");

export function appUrl(path = "/") {
  const cleanPath = String(path || "/").startsWith("/") ? String(path || "/") : `/${path}`;
  const url = new URL(cleanPath, `${APP_ORIGIN}/`);
  url.search = "";
  url.hash = "";
  return url.href;
}

export function topUrl() { return appUrl("/"); }
export function teamUrl(teamId) { return appUrl(`/t/${encodeURIComponent(String(teamId || ""))}`); }

export function lineShareUrl(url) {
  const lineUrl = new URL(url);
  lineUrl.searchParams.set("openExternalBrowser", "1");
  return lineUrl.href;
}

export async function qrImageUrl(url: string, size = 360): Promise<string> {
  return createQrSvgDataUrl(url, size);
}
