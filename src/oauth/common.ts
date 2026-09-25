import { base64UrlDecode, base64UrlEncode, constantTimeEqual, decoder, encoder } from "../security/encoding.ts";
import { randomToken } from "../security/tokens.ts";

export function createPkcePair() {
  const verifier = randomToken(48);
  return crypto.subtle.digest("SHA-256", encoder.encode(verifier)).then((digest) => ({
    verifier,
    challenge: base64UrlEncode(new Uint8Array(digest))
  }));
}

export function oauthStateValues() {
  return { state: randomToken(24), nonce: randomToken(24) };
}

export async function fetchFormJson(url, values, fetchFn = fetch) {
  const body = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) {
    if (value !== undefined && value !== null && value !== "") body.set(key, String(value));
  }
  const response = await fetchFn(url, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded", accept: "application/json" },
    body
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.error_description || data.message || data.error || `OAuth provider error (${response.status})`) as Error & { status?: number; providerData?: unknown };
    error.status = response.status;
    error.providerData = data;
    throw error;
  }
  return data;
}

export function decodeJwtPart(value) {
  return JSON.parse(decoder.decode(base64UrlDecode(value)));
}

export function decodeJwt(token) {
  const [headerPart, payloadPart, signaturePart, extra] = String(token || "").split(".");
  if (!headerPart || !payloadPart || !signaturePart || extra) throw new Error("invalid_jwt");
  return {
    headerPart,
    payloadPart,
    signaturePart,
    header: decodeJwtPart(headerPart),
    payload: decodeJwtPart(payloadPart),
    signature: base64UrlDecode(signaturePart),
    signingInput: `${headerPart}.${payloadPart}`
  };
}

export function validateOidcClaims(payload, { audience, nonce, issuers }) {
  const now = Math.floor(Date.now() / 1000);
  const aud = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
  if (!aud.includes(audience)) throw new Error("oidc_audience_mismatch");
  if (aud.length > 1 && String(payload.azp || "") !== String(audience)) throw new Error("oidc_authorized_party_mismatch");
  if (!issuers.includes(payload.iss)) throw new Error("oidc_issuer_mismatch");
  if (!Number(payload.exp) || Number(payload.exp) <= now - 30) throw new Error("oidc_token_expired");
  if (payload.iat && Number(payload.iat) > now + 120) throw new Error("oidc_iat_invalid");
  if (nonce && !constantTimeEqual(String(payload.nonce || ""), String(nonce))) throw new Error("oidc_nonce_mismatch");
  if (!payload.sub) throw new Error("oidc_subject_missing");
  return payload;
}

export function redirectUri(origin, provider) {
  return `${String(origin).replace(/\/$/, "")}/api/account/oauth/${encodeURIComponent(provider)}/callback`;
}
