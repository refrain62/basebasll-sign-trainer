import { test } from "vitest";
import assert from "node:assert/strict";
import { isValidPublicSupportUrl, publicLegalConfig } from "../../src/config/legal.ts";

test("public support URL accepts HTTPS forms and rejects unsafe schemes", () => {
  assert.equal(isValidPublicSupportUrl("https://forms.gle/abc123"), true);
  assert.equal(isValidPublicSupportUrl("https://docs.google.com/forms/d/e/example/viewform?usp=sf_link"), true);
  assert.equal(isValidPublicSupportUrl("http://forms.gle/abc123"), false);
  assert.equal(isValidPublicSupportUrl("javascript:alert(1)"), false);
  assert.equal(isValidPublicSupportUrl("https://user:pass@example.com/form"), false);
});

test("public legal config exposes supportUrl but no support email", () => {
  const config = publicLegalConfig({ PUBLIC_OPERATOR_NAME: "SIGN TRAINER運営", PUBLIC_SUPPORT_URL: "https://forms.gle/abc123" });
  assert.equal(config.configured, true);
  assert.equal(config.supportUrl, "https://forms.gle/abc123");
  assert.equal(Object.hasOwn(config, "supportEmail"), false);
  const unsafe = publicLegalConfig({ PUBLIC_OPERATOR_NAME: "SIGN TRAINER運営", PUBLIC_SUPPORT_URL: "javascript:alert(1)" });
  assert.equal(unsafe.configured, false);
  assert.equal(unsafe.supportUrl, "");
});
