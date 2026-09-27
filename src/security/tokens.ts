import { base64UrlEncode, encoder } from "./encoding.ts";

export function randomToken(byteLength = 32) {
  return base64UrlEncode(crypto.getRandomValues(new Uint8Array(byteLength)));
}

export async function sha256Token(value) {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(String(value || "")));
  return base64UrlEncode(new Uint8Array(digest));
}
