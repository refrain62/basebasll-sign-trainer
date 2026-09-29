import { describe, expect, test } from "vitest";
import { readFileSync } from "node:fs";

describe("environment, support and OAuth UI safeguards", () => {
  test("non-production pages receive a dismissible environment badge without replacing fix40 page design", () => {
    const pages = readFileSync("src/http/pages.ts", "utf8");
    const css = readFileSync("public/styles.css", "utf8");
    const lp = readFileSync("pages/index.html", "utf8");
    expect(pages).toContain("data-environment-context-badge");
    expect(badgeClient).toContain("is-dismissing");
    expect(css).toContain(".environment-context-badge.is-dismissing");
    expect(lp).toContain("lp-v2 lp-refresh");
  });

  test("team admin has contextual support links", () => {
    const admin = readFileSync("client/admin.ts", "utf8");
    expect(admin).toContain("お問い合わせ");
    for (const key of ["teamId", "teamName", "plan", "environment"]) expect(admin).toContain(`searchParams.set("${key}"`);
  });

  test("LINE credentials and team-create limit are configured for every environment", () => {
    const wrangler = readFileSync("wrangler.jsonc", "utf8");
    expect(wrangler.match(/LINE_CHANNEL_ID/g)?.length).toBeGreaterThanOrEqual(3);
    expect(wrangler.match(/LINE_CHANNEL_SECRET/g)?.length).toBeGreaterThanOrEqual(3);
    expect(wrangler.match(/ACCOUNT_TEAM_CREATE_LIMIT/g)?.length).toBeGreaterThanOrEqual(3);
  });
});
