export const APP_ORIGIN = window.location.origin.replace(/\/$/, "");

export function appUrl(path = "/") {
  const cleanPath = String(path || "/").startsWith("/") ? String(path || "/") : `/${path}`;
  const url = new URL(cleanPath, `${APP_ORIGIN}/`);
  // QR / copy URLs are intentionally clean: no auth/session/share query parameters.
  url.search = "";
  url.hash = "";
  return url.href;
}

export function topUrl() {
  return appUrl("/");
}

export function teamUrl(teamId) {
  return appUrl(`/t/${encodeURIComponent(String(teamId || ""))}`);
}

export function lineShareUrl(url) {
  const lineUrl = new URL(url);
  lineUrl.searchParams.set("openExternalBrowser", "1");
  return lineUrl.href;
}

export function qrImageUrl(url, size = 360) {
  const px = Math.max(160, Math.min(Number(size) || 360, 800));
  return `https://api.qrserver.com/v1/create-qr-code/?size=${px}x${px}&margin=14&ecc=H&data=${encodeURIComponent(url)}`;
}
