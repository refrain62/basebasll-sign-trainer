import { base64UrlDecode, encoder } from "./encoding.js";

const DEFAULT_JWKS_TTL_MS = 5 * 60 * 1000;
const CLOCK_SKEW_SECONDS = 60;
const FORCE_REFRESH_MIN_MS = 30 * 1000;
const MAX_ACCESS_JWT_CHARS = 16 * 1024;
const jwksCache = new Map();

function normalizeTeamDomain(value) {
  const raw = String(value || "").trim().replace(/\/+$/, "");
  if (!raw) return "";
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:") return "";
    if (!url.hostname.endsWith(".cloudflareaccess.com")) return "";
    return url.origin;
  } catch {
    return "";
  }
}

function parseJsonPart(part) {
  try {
    const bytes = base64UrlDecode(part);
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    return null;
  }
}

function audienceMatches(claim, expected) {
  if (typeof claim === "string") return claim === expected;
  return Array.isArray(claim) && claim.some((value) => value === expected);
}

function validTemporalClaims(payload, nowSeconds) {
  if (!Number.isFinite(Number(payload?.exp))) return false;
  if (Number(payload.exp) < nowSeconds - CLOCK_SKEW_SECONDS) return false;
  if (payload.nbf !== undefined && Number(payload.nbf) > nowSeconds + CLOCK_SKEW_SECONDS) return false;
  if (payload.iat !== undefined && Number(payload.iat) > nowSeconds + CLOCK_SKEW_SECONDS) return false;
  return true;
}

async function fetchJwks(teamDomain, fetcher, { force = false, ttlMs = DEFAULT_JWKS_TTL_MS } = {}) {
  const certsUrl = `${teamDomain}/cdn-cgi/access/certs`;
  const cached = jwksCache.get(certsUrl);
  const age = cached ? Date.now() - cached.fetchedAt : Infinity;
  if (!force && cached && age < ttlMs) return cached.keys;
  if (force && cached && age < FORCE_REFRESH_MIN_MS) return cached.keys;
  const response = await fetcher(certsUrl, {
    headers: { accept: "application/json" },
    cf: { cacheTtl: 300, cacheEverything: true }
  });
  if (!response.ok) throw new Error(`cf_access_jwks_${response.status}`);
  const json = await response.json();
  const keys = Array.isArray(json?.keys) ? json.keys : [];
  if (!keys.length) throw new Error("cf_access_jwks_empty");
  jwksCache.set(certsUrl, { keys, fetchedAt: Date.now() });
  return keys;
}

function usableSigningKey(keys, kid) {
  return keys.find((key) => key?.kid === kid && key?.kty === "RSA" && (!key.alg || key.alg === "RS256") && (!key.use || key.use === "sig"));
}

async function verifyWithJwk(signingInput, signature, jwk) {
  const key = await crypto.subtle.importKey(
    "jwk",
    jwk,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["verify"]
  );
  return crypto.subtle.verify("RSASSA-PKCS1-v1_5", key, signature, encoder.encode(signingInput));
}

export async function verifyCloudflareAccessJwt(token, {
  teamDomain,
  policyAud,
  fetcher = fetch,
  nowSeconds = Math.floor(Date.now() / 1000)
} = {}) {
  const issuer = normalizeTeamDomain(teamDomain);
  const audience = String(policyAud || "").trim();
  if (!issuer || !audience) throw new Error("cf_access_not_configured");

  const tokenText = String(token || "");
  if (!tokenText || tokenText.length > MAX_ACCESS_JWT_CHARS) throw new Error("cf_access_malformed_jwt");
  const parts = tokenText.split(".");
  if (parts.length !== 3 || parts.some((part) => !part)) throw new Error("cf_access_malformed_jwt");
  const [headerPart, payloadPart, signaturePart] = parts;
  const header = parseJsonPart(headerPart);
  const payload = parseJsonPart(payloadPart);
  if (!header || !payload || header.alg !== "RS256" || !header.kid) throw new Error("cf_access_invalid_header");
  if (payload.iss !== issuer || !audienceMatches(payload.aud, audience)) throw new Error("cf_access_claim_mismatch");
  if (!validTemporalClaims(payload, nowSeconds)) throw new Error("cf_access_token_expired");

  const signature = base64UrlDecode(signaturePart);
  const signingInput = `${headerPart}.${payloadPart}`;
  let keys = await fetchJwks(issuer, fetcher);
  let jwk = usableSigningKey(keys, header.kid);
  let verified = jwk ? await verifyWithJwk(signingInput, signature, jwk) : false;
  if (!verified) {
    // Access rotates signing keys. Refresh once before rejecting so a warm isolate
    // does not deny a valid token immediately after a key rotation.
    keys = await fetchJwks(issuer, fetcher, { force: true });
    jwk = usableSigningKey(keys, header.kid);
    verified = jwk ? await verifyWithJwk(signingInput, signature, jwk) : false;
  }
  if (!jwk) throw new Error("cf_access_signing_key_not_found");
  if (!verified) throw new Error("cf_access_invalid_signature");
  return payload;
}

export function clearCloudflareAccessJwksCacheForTests() {
  jwksCache.clear();
}
