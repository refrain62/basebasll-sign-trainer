import { PBKDF2_ITERATIONS } from "../config/constants.js";
import { normalizeSecret } from "../validation/common.js";
import { base64UrlDecode, base64UrlEncode, constantTimeBytes, encoder } from "./encoding.js";

export function isSupportedPasswordHash(stored) {
  if (!stored || typeof stored !== "string") return false;
  const [scheme, iterRaw, saltRaw, hashRaw, extraPart] = stored.split("$");
  if (scheme !== "pbkdf2-sha256" || extraPart || !saltRaw || !hashRaw) return false;
  const iterations = Number(iterRaw);
  if (!Number.isInteger(iterations) || iterations < 10000 || iterations > 1000000) return false;
  try {
    return base64UrlDecode(saltRaw).length >= 8 && base64UrlDecode(hashRaw).length >= 16;
  } catch {
    return false;
  }
}

export async function hashPassword(value) {
  const normalized = normalizeSecret(value);
  if (!normalized) throw new Error("empty password");
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey("raw", encoder.encode(normalized), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations: PBKDF2_ITERATIONS }, key, 256);
  return `pbkdf2-sha256$${PBKDF2_ITERATIONS}$${base64UrlEncode(salt)}$${base64UrlEncode(new Uint8Array(bits))}`;
}

export async function verifyPassword(value, stored) {
  return (await verifyPasswordDetailed(value, stored)).valid;
}

export async function verifyPasswordDetailed(value, stored) {
  if (!stored || typeof stored !== "string") return { valid: false, needsRehash: false };
  const [scheme, iterRaw, saltRaw, hashRaw, extraPart] = stored.split("$");
  if (scheme !== "pbkdf2-sha256" || extraPart) return { valid: false, needsRehash: false };
  const iterations = Number(iterRaw);
  if (!Number.isInteger(iterations) || iterations < 10000 || iterations > 1000000) return { valid: false, needsRehash: false };
  try {
    const salt = base64UrlDecode(saltRaw);
    const expected = base64UrlDecode(hashRaw);
    const key = await crypto.subtle.importKey("raw", encoder.encode(normalizeSecret(value)), "PBKDF2", false, ["deriveBits"]);
    const bits = new Uint8Array(await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations }, key, expected.length * 8));
    const valid = constantTimeBytes(bits, expected);
    return { valid, needsRehash: valid && iterations < PBKDF2_ITERATIONS };
  } catch {
    return { valid: false, needsRehash: false };
  }
}
