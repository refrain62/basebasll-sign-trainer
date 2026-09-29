import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("latest product rules regression", () => {
  it("keeps the requested plan content limits in migration and plan UI", () => {
    const migration = read("migrations/0021_plan_content_limits.sql");
    const plans = read("pages/plans.html");
    expect(migration).toContain("('free','sign_count',1,10)");
    expect(migration).toContain("('team_plus','multiple_sign_groups',1,3)");
    expect(migration).toContain("('team_plus','sign_count',1,20)");
    expect(migration).toContain("('team_pro','sign_count',1,NULL)");
    expect(plans).toContain("最大20個");
    expect(plans).toContain("最大3グループ");
    expect(plans).toContain("無制限");
  });

  it("uses admin-specific login wording and does not expose PWA wording in player-facing templates", () => {
    const header = read("pages/components/site-header.html");
    const team = read("pages/team.html");
    const install = read("pages/install.html");
    expect(header).toContain("チーム管理者ログイン");
    expect(team).not.toContain(">PWA<");
    expect(install).not.toContain(">PWA<");
  });

  it("keeps non-production environment warnings and handle-name registration", () => {
    const account = read("client/account.ts");
    const landing = read("client/landing.ts");
    expect(account).toContain("STAGING 環境");
    expect(account).toContain("ハンドルネーム");
    expect(landing).toContain("ここで登録したチームは本番環境には作成されません。");
    expect(landing).toContain("register-handle-name");
  });
});
