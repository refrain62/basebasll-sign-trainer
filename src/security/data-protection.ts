import { base64UrlDecode, base64UrlEncode, encoder, decoder } from "./encoding.ts";

const ENCRYPTED_PREFIX = "enc:v1:";
const LOOKUP_PREFIX = "hmac:v1:";
const MIN_SECRET_LENGTH = 32;

function strongSecret(value) {
  return typeof value === "string" && value.trim().length >= MIN_SECRET_LENGTH;
}

async function sha256Key(secret, usage) {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(String(secret)));
  if (usage === "aes") return crypto.subtle.importKey("raw", digest, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
  return crypto.subtle.importKey("raw", digest, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
}

export function dataProtectionConfigError(env) {
  const missing = [];
  if (!strongSecret(env?.DATA_ENCRYPTION_KEY)) missing.push("DATA_ENCRYPTION_KEY");
  if (!strongSecret(env?.DATA_LOOKUP_KEY)) missing.push("DATA_LOOKUP_KEY");
  if (!strongSecret(env?.PASSWORD_PEPPER)) missing.push("PASSWORD_PEPPER");
  if (!missing.length) return null;
  return {
    error: "data_protection_not_configured",
    message: `${missing.join(", ")} は32文字以上のランダムなSecretとして設定してください。`,
    missing
  };
}

export function isEncryptedValue(value) {
  return typeof value === "string" && value.startsWith(ENCRYPTED_PREFIX);
}

export function isLookupValue(value) {
  return typeof value === "string" && value.startsWith(LOOKUP_PREFIX);
}

export function createDataProtector({ encryptionKey, lookupKey }) {
  if (!strongSecret(encryptionKey) || !strongSecret(lookupKey)) {
    throw new Error("data protection keys are not configured safely");
  }
  let aesKeyPromise;
  let hmacKeyPromise;
  const aesKey = () => (aesKeyPromise ||= sha256Key(encryptionKey, "aes"));
  const hmacKey = () => (hmacKeyPromise ||= sha256Key(lookupKey, "hmac"));

  return {
    isEncrypted: isEncryptedValue,
    isLookup: isLookupValue,

    async encrypt(value, context) {
      if (value === null || value === undefined) return value;
      const text = String(value);
      if (!text || isEncryptedValue(text)) return text;
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const additionalData = encoder.encode(`sign-trainer:v1:${String(context)}`);
      const ciphertext = new Uint8Array(await crypto.subtle.encrypt(
        { name: "AES-GCM", iv, additionalData, tagLength: 128 },
        await aesKey(),
        encoder.encode(text)
      ));
      return `${ENCRYPTED_PREFIX}${base64UrlEncode(iv)}:${base64UrlEncode(ciphertext)}`;
    },

    async decrypt(value, context) {
      if (value === null || value === undefined) return value;
      const text = String(value);
      if (!text || !isEncryptedValue(text)) return text;
      const parts = text.split(":");
      if (parts.length !== 4 || parts[0] !== "enc" || parts[1] !== "v1") throw new Error("invalid_encrypted_value");
      const iv = base64UrlDecode(parts[2]);
      const ciphertext = base64UrlDecode(parts[3]);
      if (iv.length !== 12 || ciphertext.length < 16) throw new Error("invalid_encrypted_value");
      const additionalData = encoder.encode(`sign-trainer:v1:${String(context)}`);
      const plaintext = await crypto.subtle.decrypt(
        { name: "AES-GCM", iv, additionalData, tagLength: 128 },
        await aesKey(),
        ciphertext
      );
      return decoder.decode(plaintext);
    },

    async lookup(value, context) {
      const text = String(value ?? "");
      const signature = new Uint8Array(await crypto.subtle.sign(
        "HMAC",
        await hmacKey(),
        encoder.encode(`sign-trainer:v1:${String(context)}\0${text}`)
      ));
      return `${LOOKUP_PREFIX}${base64UrlEncode(signature)}`;
    }
  };
}

export function createDataProtectorFromEnv(env) {
  return createDataProtector({
    encryptionKey: env?.DATA_ENCRYPTION_KEY,
    lookupKey: env?.DATA_LOOKUP_KEY
  });
}
