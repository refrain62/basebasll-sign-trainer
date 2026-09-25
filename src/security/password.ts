import { PBKDF2_ITERATIONS } from "../config/constants.ts";
import { normalizeSecret } from "../validation/common.ts";
import { base64UrlDecode, base64UrlEncode, constantTimeBytes, encoder } from "./encoding.ts";

const LEGACY_SCHEME = "pbkdf2-sha256";
const PEPPERED_SCHEME = "pbkdf2-sha256-pepper-v1";

function validPepper(value) {
  return typeof value === "string" && value.trim().length >= 32;
}

async function pepperedPasswordBytes(value, pepper) {
  if (!validPepper(pepper)) throw new Error("PASSWORD_PEPPER is not configured safely");
  const key = await crypto.subtle.importKey("raw", encoder.encode(String(pepper)), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(normalizeSecret(value))));
}

async function derive(passwordBytes, salt, iterations, bitLength) {
  const key = await crypto.subtle.importKey("raw", passwordBytes, "PBKDF2", false, ["deriveBits"]);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations }, key, bitLength));
}

export function isSupportedPasswordHash(stored) {
  if (!stored || typeof stored !== "string") return false;
  const [scheme, iterRaw, saltRaw, hashRaw, extraPart] = stored.split("$");
  if (![LEGACY_SCHEME, PEPPERED_SCHEME].includes(scheme) || extraPart || !saltRaw || !hashRaw) return false;
  const iterations = Number(iterRaw);
  if (!Number.isInteger(iterations) || iterations < 10000 || iterations > 1000000) return false;
  try {
    return base64UrlDecode(saltRaw).length >= 8 && base64UrlDecode(hashRaw).length >= 16;
  } catch {
    return false;
  }
}

export async function hashPassword(value, pepper) {
  const normalized = normalizeSecret(value);
  if (!normalized) throw new Error("empty password");
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const material = await pepperedPasswordBytes(normalized, pepper);
  const bits = await derive(material, salt, PBKDF2_ITERATIONS, 256);
  return `${PEPPERED_SCHEME}$${PBKDF2_ITERATIONS}$${base64UrlEncode(salt)}$${base64UrlEncode(bits)}`;
}

export async function verifyPassword(value, stored, pepper) {
  return (await verifyPasswordDetailed(value, stored, pepper)).valid;
}

export async function verifyPasswordDetailed(value, stored, pepper) {
  if (!stored || typeof stored !== "string") return { valid: false, needsRehash: false };
  const [scheme, iterRaw, saltRaw, hashRaw, extraPart] = stored.split("$");
  if (![LEGACY_SCHEME, PEPPERED_SCHEME].includes(scheme) || extraPart) return { valid: false, needsRehash: false };
  const iterations = Number(iterRaw);
  if (!Number.isInteger(iterations) || iterations < 10000 || iterations > 1000000) return { valid: false, needsRehash: false };
  try {
    const salt = base64UrlDecode(saltRaw);
    const expected = base64UrlDecode(hashRaw);
    const material = scheme === PEPPERED_SCHEME
      ? await pepperedPasswordBytes(value, pepper)
      : encoder.encode(normalizeSecret(value));
    const bits = await derive(material, salt, iterations, expected.length * 8);
    const valid = constantTimeBytes(bits, expected);
    return {
      valid,
      needsRehash: valid && (scheme !== PEPPERED_SCHEME || iterations < PBKDF2_ITERATIONS)
    };
  } catch {
    return { valid: false, needsRehash: false };
  }
}
