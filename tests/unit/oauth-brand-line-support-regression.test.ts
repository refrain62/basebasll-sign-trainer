import { describe, expect, test } from "vitest";
import { readFileSync } from "node:fs";

const wrangler = readFileSync("wrangler.jsonc", "utf8");
const account = readFileSync("client/account.ts", "utf8");
const admin = readFileSync("client/admin.ts", "utf8");
const styles = readFileSync("public/styles.css", "utf8");

describe("OAuth brand and support regression", () => {
  test("uses dedicated Google and LINE login marks", () => {
    expect(account).toContain('/assets/google-g-logo.svg');
    expect(account).toContain('/assets/line-login-icon.svg');
    expect(admin).toContain('/assets/google-g-logo.svg');
    expect(admin).toContain('/assets/line-login-icon.svg');
    expect(styles).toContain('#06C755');
    expect(styles).toContain('#747775');
  });

  test("requires LINE Login secrets in production, dev and staging", () => {
    expect((wrangler.match(/LINE_CHANNEL_ID/g) || []).length).toBeGreaterThanOrEqual(3);
    expect((wrangler.match(/LINE_CHANNEL_SECRET/g) || []).length).toBeGreaterThanOrEqual(3);
  });

  test("team admin includes support links and passes team context", () => {
    expect(admin).toContain('data-team-support-link');
    expect(admin).toContain('teamId');
    expect(admin).toContain('teamName');
    expect(admin).toContain('plan');
    expect(admin).toContain('environment');
    expect(admin).toContain('/api/public/legal');
  });
});
