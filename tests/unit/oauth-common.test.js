import test from "node:test";
import assert from "node:assert/strict";
import { createPkcePair, redirectUri, validateOidcClaims } from "../../src/oauth/common.js";

test("PKCE uses an RFC7636-sized verifier and S256 challenge", async () => {
  const { verifier, challenge } = await createPkcePair();
  assert.ok(verifier.length >= 43 && verifier.length <= 128);
  assert.match(verifier, /^[A-Za-z0-9_-]+$/);
  assert.equal(challenge.length, 43);
  assert.match(challenge, /^[A-Za-z0-9_-]+$/);
});

test("OIDC validation checks audience, issuer, expiry, nonce and subject", () => {
  const now = Math.floor(Date.now() / 1000);
  const valid = { aud: "client-1", iss: "https://issuer.example", exp: now + 300, iat: now, nonce: "n-1", sub: "subject-1" };
  assert.equal(validateOidcClaims(valid, { audience: "client-1", nonce: "n-1", issuers: ["https://issuer.example"] }).sub, "subject-1");
  assert.throws(() => validateOidcClaims({ ...valid, aud: "other" }, { audience: "client-1", nonce: "n-1", issuers: [valid.iss] }), /audience/);
  assert.throws(() => validateOidcClaims({ ...valid, nonce: "wrong" }, { audience: "client-1", nonce: "n-1", issuers: [valid.iss] }), /nonce/);
  assert.throws(() => validateOidcClaims({ ...valid, exp: now - 100 }, { audience: "client-1", nonce: "n-1", issuers: [valid.iss] }), /expired/);
});

test("OAuth callback URI is deterministic per origin and provider", () => {
  assert.equal(redirectUri("https://example.com/", "google"), "https://example.com/api/account/oauth/google/callback");
  assert.equal(redirectUri("http://127.0.0.1:8787", "line"), "http://127.0.0.1:8787/api/account/oauth/line/callback");
});
