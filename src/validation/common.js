export function normalizeTeamId(value) {
  const id = typeof value === "string" ? value.trim() : "";
  return /^[A-Za-z0-9_-]{4,40}$/.test(id) ? id : "";
}

export function isStrongSecret(value, minLength) {
  return typeof value === "string" && value.trim().length >= minLength;
}

export function normalizeSecret(value) {
  return typeof value === "string" ? value.trim().normalize("NFC") : "";
}

export function isAdminCredential(value) {
  const normalized = normalizeSecret(value);
  return normalized.length >= 12 && normalized.length <= 200 && /[A-Za-z]/.test(normalized) && /[0-9]/.test(normalized);
}

export function cleanName(value, max) {
  return typeof value === "string" ? value.trim().normalize("NFC").slice(0, max) : "";
}

export function cleanComment(value) {
  return String(value ?? "").trim().slice(0, 300);
}

export function parseYouTubeUrl(value) {
  if (typeof value !== "string") return null;
  const raw = value.trim();
  if (!raw) return null;
  if (/^[A-Za-z0-9_-]{11}$/.test(raw)) return { videoId: raw, url: `https://youtu.be/${raw}` };
  try {
    const url = new URL(raw);
    const host = url.hostname.replace(/^www\./, "").toLowerCase();
    let id = "";
    if (host === "youtu.be") id = url.pathname.split("/").filter(Boolean)[0] || "";
    else if (["youtube.com", "m.youtube.com", "music.youtube.com"].includes(host)) {
      if (url.pathname === "/watch") id = url.searchParams.get("v") || "";
      else {
        const parts = url.pathname.split("/").filter(Boolean);
        if (["shorts", "embed", "live"].includes(parts[0])) id = parts[1] || "";
      }
    }
    if (!/^[A-Za-z0-9_-]{11}$/.test(id)) return null;
    return { videoId: id, url: `https://www.youtube.com/watch?v=${id}` };
  } catch {
    return null;
  }
}

export function teamUrls(teamId) {
  return { playerPath: `/t/${teamId}`, adminPath: `/t/${teamId}/admin` };
}

export function randomId(length = 10) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes, (b) => chars[b % chars.length]).join("");
}

export function positiveNumber(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}
