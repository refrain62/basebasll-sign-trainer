import { test } from "vitest";
import assert from "node:assert/strict";
import {
  cookieValue,
  createSessionToken,
  hashPassword,
  parseCookies,
  safeJson,
  systemAuth,
  systemSession,
  validateCloudflareAccess,
  validateMutationRequest,
  verifyCloudflareAccessJwt,
  verifyPasswordDetailed,
  verifySessionToken,
  withHeaders,
  isFreshAccountSession,
  createDataProtector,
  dataProtectionConfigError,
  sanitizeAuditDetail
} from "../../src/backend.ts";

const SESSION_SECRET = "SignTrainerUnitTestSessionSecret2026";
const PASSWORD_PEPPER = "SignTrainerUnitTestPasswordPepper2026";
const DATA_ENCRYPTION_KEY = "SignTrainerUnitTestEncryptionKey2026";
const DATA_LOOKUP_KEY = "SignTrainerUnitTestLookupKey2026";

test("password hashing verifies the right value and rejects the wrong value", async () => {
  const hash = await hashPassword("Baseball2026", PASSWORD_PEPPER);
  assert.match(hash, /^pbkdf2-sha256-pepper-v1\$600000\$/);
  assert.deepEqual(await verifyPasswordDetailed("Baseball2026", hash, PASSWORD_PEPPER), { valid: true, needsRehash: false });
  assert.deepEqual(await verifyPasswordDetailed("WrongPassword2026", hash, PASSWORD_PEPPER), { valid: false, needsRehash: false });
  assert.deepEqual(await verifyPasswordDetailed("Baseball2026", hash, "wrong-pepper-but-long-enough-123456"), { valid: false, needsRehash: false });
});



test("legacy salt-only PBKDF2 hashes still verify and request peppered rehash", async () => {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode("Baseball2026"), "PBKDF2", false, ["deriveBits"]);
  const bits = new Uint8Array(await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations: 120000 }, key, 256));
  const b64 = (bytes) => Buffer.from(bytes).toString("base64url");
  const legacy = `pbkdf2-sha256$120000$${b64(salt)}$${b64(bits)}`;
  assert.deepEqual(await verifyPasswordDetailed("Baseball2026", legacy, PASSWORD_PEPPER), { valid: true, needsRehash: true });
});

test("session token round-trips and rejects tampering", async () => {
  const payload = { role: "player", teamId: "abc123", ver: 2, exp: 9999999999 };
  const token = await createSessionToken(payload, SESSION_SECRET);
  assert.deepEqual(await verifySessionToken(token, SESSION_SECRET), payload);
  const changed = `${token.slice(0, -1)}${token.endsWith("A") ? "B" : "A"}`;
  assert.equal(await verifySessionToken(changed, SESSION_SECRET), null);
  assert.equal(await verifySessionToken(token, `${SESSION_SECRET}x`), null);
});

test("mutation validation enforces same-origin and JSON", async () => {
  const url = new URL("https://example.com/api/team-admin/team");
  const good = new Request(url, { method: "PUT", headers: { origin: url.origin, "sec-fetch-site": "same-origin", "content-type": "application/json" }, body: "{}" });
  assert.equal(validateMutationRequest(good, url), null);

  const noOrigin = new Request(url, { method: "PUT", headers: { "content-type": "application/json" }, body: "{}" });
  assert.equal(validateMutationRequest(noOrigin, url).status, 403);

  const crossSite = new Request(url, { method: "PUT", headers: { origin: url.origin, "sec-fetch-site": "cross-site", "content-type": "application/json" }, body: "{}" });
  assert.equal(validateMutationRequest(crossSite, url).status, 403);

  const form = new Request(url, { method: "PUT", headers: { origin: url.origin, "content-type": "application/x-www-form-urlencoded" }, body: "x=1" });
  assert.equal(validateMutationRequest(form, url).status, 415);
});

async function makeAccessJwt({ email = "coach@example.com", aud = "aud-123", iss = "https://team.cloudflareaccess.com", exp = 2000 } = {}) {
  const pair = await crypto.subtle.generateKey({ name: "RSASSA-PKCS1-v1_5", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" }, true, ["sign", "verify"]);
  const exportedJwk = await crypto.subtle.exportKey("jwk", pair.publicKey);
  const jwk: JsonWebKey & { kid: string; alg: string; use: string } = {
    ...exportedJwk,
    kid: "test-kid",
    alg: "RS256",
    use: "sig"
  };
  const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString("base64url");
  const header = encode({ alg: "RS256", kid: jwk.kid, typ: "JWT" });
  const payload = encode({ email, aud, iss, exp, iat: 1000 });
  const input = `${header}.${payload}`;
  const signature = new Uint8Array(await crypto.subtle.sign("RSASSA-PKCS1-v1_5", pair.privateKey, new TextEncoder().encode(input)));
  return { token: `${input}.${Buffer.from(signature).toString("base64url")}`, jwk };
}

test("Cloudflare Access gate verifies RS256 signature, issuer, audience and verified email allowlist", async () => {
  const url = "https://example.com/admin";
  assert.equal((await validateCloudflareAccess(new Request(url), {})).status, 403);
  const { token, jwk } = await makeAccessJwt();
  const fetcher = async () => new Response(JSON.stringify({ keys: [jwk] }), { status: 200, headers: { "content-type": "application/json" } });
  const env = { CF_ACCESS_TEAM_DOMAIN: "https://team.cloudflareaccess.com", CF_ACCESS_POLICY_AUD: "aud-123", SYSTEM_ADMIN_ALLOWED_EMAILS: "coach@example.com" };
  const headers = { "cf-access-authenticated-user-email": "spoofed@example.com", "cf-access-jwt-assertion": token };
  assert.equal(await validateCloudflareAccess(new Request(url, { headers }), env, { fetcher, nowSeconds: 1500 }), null);
  assert.equal((await validateCloudflareAccess(new Request(url, { headers }), { ...env, SYSTEM_ADMIN_ALLOWED_EMAILS: "other@example.com" }, { fetcher, nowSeconds: 1500 })).status, 403);
  assert.equal((await validateCloudflareAccess(new Request(url, { headers }), { ...env, CF_ACCESS_POLICY_AUD: "wrong-aud" }, { fetcher, nowSeconds: 1500 })).status, 403);
});

test("Cloudflare Access verifier rejects tampered JWTs", async () => {
  const { token, jwk } = await makeAccessJwt();
  const fetcher = async () => new Response(JSON.stringify({ keys: [jwk] }));
  const payloadPart = token.split(".")[1];
  const changedPayload = Buffer.from(JSON.stringify({ email: "attacker@example.com", aud: "aud-123", iss: "https://team.cloudflareaccess.com", exp: 2000, iat: 1000 })).toString("base64url");
  const tampered = token.replace(payloadPart, changedPayload);
  await assert.rejects(() => verifyCloudflareAccessJwt(tampered, { teamDomain: "https://team.cloudflareaccess.com", policyAud: "aud-123", fetcher, nowSeconds: 1500 }), /invalid_signature/);
});


test("fresh account authentication expires after ten minutes", () => {
  assert.equal(isFreshAccountSession({ userId: "u1", authAt: 1000 }, 600, 1599), true);
  assert.equal(isFreshAccountSession({ userId: "u1", authAt: 1000 }, 600, 1601), false);
  assert.equal(isFreshAccountSession({ userId: "u1" }, 600, 1001), false);
});

test("cookies are __Host/Secure remotely but simple locally", () => {
  const local = cookieValue("st_system", "token", 60, new URL("http://localhost:8787/admin"), "Strict");
  assert.match(local, /^st_system=token;/);
  assert.doesNotMatch(local, /Secure/);
  assert.match(local, /SameSite=Strict/);

  const remote = cookieValue("st_system", "token", 60, new URL("https://example.com/admin"), "Strict");
  assert.match(remote, /^__Host-st_system=token;/);
  assert.match(remote, /Secure/);
  assert.match(remote, /Path=\//);
});

test("cookie parser keeps values after the first equals sign", () => {
  assert.deepEqual(parseCookies("a=1; token=abc==; empty="), { a: "1", token: "abc==", empty: "" });
});

test("safeJson parses JSON and rejects payloads over 64KiB", async () => {
  const small = new Request("https://example.com", { method: "POST", body: JSON.stringify({ ok: true }) });
  assert.deepEqual(await safeJson(small), { ok: true });

  const largeText = JSON.stringify({ text: "x".repeat(70 * 1024) });
  const large = new Request("https://example.com", { method: "POST", body: largeText });
  assert.deepEqual(await safeJson(large), { __error: "payload_too_large" });
});

test("security headers keep inline script/style execution disabled", async () => {
  const response = withHeaders(new Response("ok"), { noIndex: true, noCache: true });
  const csp = response.headers.get("content-security-policy");
  assert.match(csp, /script-src 'self'/);
  assert.match(csp, /style-src 'self'/);
  assert.doesNotMatch(csp, /unsafe-inline/);
  assert.match(csp, /frame-src https:\/\/www\.youtube-nocookie\.com/);
  assert.equal(response.headers.get("x-robots-tag"), "noindex, nofollow, noarchive");
  assert.equal(response.headers.get("cache-control"), "no-cache, no-store, must-revalidate");
});


test("system admin reports SESSION_SECRET and SYSTEM_ADMIN_SECRET configuration separately", async () => {
  const request = new Request("http://localhost:8787/api/system/session");
  const missingSession = await systemSession(request, { SESSION_SECRET: "short", SYSTEM_ADMIN_SECRET: "admin12345678" });
  assert.equal(missingSession.status, 503);
  assert.equal((await missingSession.json()).error, "session_secret_not_configured");

  const missingAdmin = await systemSession(request, { SESSION_SECRET, SYSTEM_ADMIN_SECRET: "lettersOnlyPassword" });
  assert.equal(missingAdmin.status, 503);
  assert.equal((await missingAdmin.json()).error, "system_admin_secret_not_configured");
});

test("system admin accepts a 12+ character alphanumeric secret", async () => {
  const calls = [];
  const db = {
    prepare(sql) {
      return {
        bind(...params) {
          calls.push({ sql, params });
          return {
            first: async () => null,
            run: async () => ({ success: true, meta: {} }),
            all: async () => ({ results: [] })
          };
        },
        all: async () => ({ results: [] })
      };
    }
  };
  const url = new URL("http://localhost:8787/api/system/auth");
  const request = new Request(url, {
    method: "POST",
    headers: { "content-type": "application/json", origin: url.origin },
    body: JSON.stringify({ secret: "admin12345678" })
  });
  const response = await systemAuth(request, { DB: db, SESSION_SECRET, SYSTEM_ADMIN_SECRET: "admin12345678", ADMIN_SESSION_HOURS: "12" }, url);
  assert.equal(response.status, 200);
  assert.equal((await response.json()).ok, true);
  assert.match(response.headers.get("set-cookie"), /^st_system=/);
  assert.ok(calls.some(({ sql }) => sql.includes("auth_rate_limits")));
  assert.ok(calls.some(({ sql }) => sql.includes("audit_log")));
});


test("application data encryption uses randomized AES-GCM while lookup HMAC stays deterministic", async () => {
  const protector = createDataProtector({ encryptionKey: DATA_ENCRYPTION_KEY, lookupKey: DATA_LOOKUP_KEY });
  const first = await protector.encrypt("スクイズ", "signs.name");
  const second = await protector.encrypt("スクイズ", "signs.name");
  assert.match(first, /^enc:v1:/);
  assert.notEqual(first, second);
  assert.equal(await protector.decrypt(first, "signs.name"), "スクイズ");
  await assert.rejects(() => protector.decrypt(first, "sign_groups.name"));
  const lookup1 = await protector.lookup("provider-subject", "user_identities.provider_subject:google");
  const lookup2 = await protector.lookup("provider-subject", "user_identities.provider_subject:google");
  assert.equal(lookup1, lookup2);
  assert.match(lookup1, /^hmac:v1:/);
});

test("data protection configuration requires encryption, lookup and password pepper secrets", () => {
  assert.equal(dataProtectionConfigError({ DATA_ENCRYPTION_KEY, DATA_LOOKUP_KEY, PASSWORD_PEPPER }), null);
  const error = dataProtectionConfigError({ DATA_ENCRYPTION_KEY, DATA_LOOKUP_KEY, PASSWORD_PEPPER: "short" });
  assert.equal(error.error, "data_protection_not_configured");
  assert.deepEqual(error.missing, ["PASSWORD_PEPPER"]);
});

test("audit details redact content-bearing fields before persistence", () => {
  assert.deepEqual(sanitizeAuditDetail({ signId: 1, name: "スクイズ", comment: "胸を触る", nested: { email: "coach@example.com", enabled: true } }), {
    signId: 1, name: "[redacted]", comment: "[redacted]", nested: { email: "[redacted]", enabled: true }
  });
});
