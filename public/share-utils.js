import { createQrSvgDataUrl } from "./vendor/qrcode-local.js?v=__ASSET_VERSION__";

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

export function qrImageUrl(url, size = 360) {
  return createQrSvgDataUrl(url, size);
}
