import test from "node:test";
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
  verifyPasswordDetailed,
  verifySessionToken,
  withHeaders
} from "../../src/backend.js";

const SESSION_SECRET = "SignTrainerUnitTestSessionSecret2026";

test("password hashing verifies the right value and rejects the wrong value", async () => {
  const hash = await hashPassword("Baseball2026");
  assert.match(hash, /^pbkdf2-sha256\$600000\$/);
  assert.deepEqual(await verifyPasswordDetailed("Baseball2026", hash), { valid: true, needsRehash: false });
  assert.deepEqual(await verifyPasswordDetailed("WrongPassword2026", hash), { valid: false, needsRehash: false });
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

test("Cloudflare Access gate requires both headers and optional allowlist", () => {
  const url = "https://example.com/admin";
  assert.equal(validateCloudflareAccess(new Request(url), {}).status, 403);
  const headers = { "cf-access-authenticated-user-email": "coach@example.com", "cf-access-jwt-assertion": "assertion" };
  assert.equal(validateCloudflareAccess(new Request(url, { headers }), {}), null);
  assert.equal(validateCloudflareAccess(new Request(url, { headers }), { SYSTEM_ADMIN_ALLOWED_EMAILS: "coach@example.com" }), null);
  assert.equal(validateCloudflareAccess(new Request(url, { headers }), { SYSTEM_ADMIN_ALLOWED_EMAILS: "other@example.com" }).status, 403);
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
