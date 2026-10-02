import { describe, expect, test } from "vitest";
import { readFileSync } from "node:fs";

const repo = readFileSync("src/repositories/user-repository.ts", "utf8");
const account = readFileSync("client/account.ts", "utf8");
const admin = readFileSync("client/admin.ts", "utf8");
const landing = readFileSync("client/landing.ts", "utf8");
const lp = readFileSync("pages/index.html", "utf8");
const wrangler = readFileSync("wrangler.jsonc", "utf8");

describe("post-login administrator name review", () => {
  test("does not ask for a handle before OAuth and shows a prominent review after login", () => {
    expect(account).not.toContain('id="account-register-handle"');
    expect(admin).not.toContain('id="team-admin-login-handle"');
    expect(landing).not.toContain("register-handle-name");
    expect(lp).not.toContain('id="register-handle-name"');
    expect(account).toContain("account-name-review-callout");
    expect(account).toContain("管理者名を確認してください");
    expect(admin).toContain("admin-name-review-notice");
  });

  test("marks the handle reviewed only after the authenticated profile update", () => {
    expect(repo).toContain("display_name_reviewed_at=CURRENT_TIMESTAMP");
    expect(repo).toContain("needsDisplayNameReview: !row.display_name_reviewed_at");
  });

  test("contains the supplied production Cloudflare Access AUD", () => {
    expect(wrangler).toContain("373588f30e34398c12be5ccf24a8b2f8838a2db6423925d8d61100a8eabfc91d");
    expect(wrangler).toContain("https://refrain62.cloudflareaccess.com");
  });
});
