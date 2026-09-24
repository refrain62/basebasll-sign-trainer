import test from "node:test";
import assert from "node:assert/strict";
import {
  cleanComment,
  cleanName,
  isAdminCredential,
  normalizeSecret,
  normalizeTeamId,
  pageAssetForPath,
  parseYouTubeUrl,
  sessionSecretConfigError,
  systemAdminSecretConfigError,
  teamUrls
} from "../../src/backend.js";

test("team ID accepts only expected characters and length", () => {
  assert.equal(normalizeTeamId(" 6BnWv2K3zo "), "6BnWv2K3zo");
  assert.equal(normalizeTeamId("abc"), "");
  assert.equal(normalizeTeamId("team/evil"), "");
  assert.equal(normalizeTeamId("a".repeat(41)), "");
});

test("admin credential policy is 12+ chars with letters and numbers", () => {
  assert.equal(isAdminCredential("admin12345678"), true);
  assert.equal(isAdminCredential("Baseball2026"), true);
  assert.equal(isAdminCredential("abcdefghijkl"), false);
  assert.equal(isAdminCredential("123456789012"), false);
  assert.equal(isAdminCredential("Abc123"), false);
});

test("secret normalization trims and normalizes unicode", () => {
  assert.equal(normalizeSecret("  abc123  "), "abc123");
  assert.equal(normalizeSecret("e\u0301"), "é");
});

test("cleanName trims, normalizes and enforces maximum length", () => {
  assert.equal(cleanName("  テスト  ", 10), "テスト");
  assert.equal(cleanName("abcdef", 3), "abc");
  assert.equal(cleanName(null, 20), "");
});

test("comments preserve line breaks but are trimmed and limited", () => {
  assert.equal(cleanComment("  1行目\n2行目  "), "1行目\n2行目");
  assert.equal(cleanComment("x".repeat(400)).length, 300);
});

test("YouTube parser accepts supported URL forms and rejects spoofing", () => {
  const id = "JYT0yxyvHJU";
  assert.deepEqual(parseYouTubeUrl(id), { videoId: id, url: `https://youtu.be/${id}` });
  assert.equal(parseYouTubeUrl(`https://youtu.be/${id}`).videoId, id);
  assert.equal(parseYouTubeUrl(`https://www.youtube.com/watch?v=${id}&t=10`).videoId, id);
  assert.equal(parseYouTubeUrl(`https://youtube.com/shorts/${id}`).videoId, id);
  assert.equal(parseYouTubeUrl(`https://youtube.com/embed/${id}`).videoId, id);
  assert.equal(parseYouTubeUrl(`https://youtube.com/live/${id}`).videoId, id);
  assert.equal(parseYouTubeUrl(`https://youtube.com.evil.example/watch?v=${id}`), null);
  assert.equal(parseYouTubeUrl("not-a-video!"), null);
});

test("secret configuration errors report the actual missing setting", () => {
  assert.equal(sessionSecretConfigError({ SESSION_SECRET: "x".repeat(32) }), null);
  assert.equal(sessionSecretConfigError({ SESSION_SECRET: "short" }).error, "session_secret_not_configured");
  assert.equal(systemAdminSecretConfigError({ SYSTEM_ADMIN_SECRET: "admin12345678" }), null);
  assert.equal(systemAdminSecretConfigError({ SYSTEM_ADMIN_SECRET: "abcdefghijkl" }).error, "system_admin_secret_not_configured");
});

test("page routing resolves only expected application pages", () => {
  assert.equal(pageAssetForPath("/"), "/__pages/index.txt");
  assert.equal(pageAssetForPath("/admin"), "/__pages/admin.txt");
  assert.equal(pageAssetForPath("/register"), "/__pages/admin.txt");
  assert.equal(pageAssetForPath("/t/abc123"), "/__pages/team.txt");
  assert.equal(pageAssetForPath("/t/abc123/admin"), "/__pages/admin.txt");
  assert.equal(pageAssetForPath("/api/signs"), null);
});

test("teamUrls never exposes a passphrase", () => {
  assert.deepEqual(teamUrls("abc123"), { playerPath: "/t/abc123", adminPath: "/t/abc123/admin" });
});
