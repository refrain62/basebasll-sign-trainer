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

  it("keeps non-production environment warnings and prompts for the handle after OAuth login", () => {
    const account = read("client/account.ts");
    const admin = read("client/admin.ts");
    const controller = read("src/controllers/account-controller.ts");
    const migration = read("migrations/0023_display_name_review.sql");
    expect(account).toContain("管理者名を確認してください");
    expect(account).toContain("名前を確認・変更する");
    expect(account).not.toContain('id="account-register-handle"');
    expect(admin).not.toContain('id="team-admin-login-handle"');
    expect(admin).not.toContain('id="team-admin-claim-handle"');
    expect(controller).toContain('review.searchParams.set("reviewName", "1")');
    expect(migration).toContain("display_name_reviewed_at");
  });

  it("does not expose other administrators' email addresses in team management", () => {
    const service = read("src/services/admin-membership-service.ts");
    const admin = read("client/admin.ts");
    expect(service).toContain('String(member.userId || "") === String(userId || "")');
    expect(service).toContain('email: String(member.userId || "") === String(userId || "") ? (member.email || "") : ""');
    expect(admin).toContain("メールアドレス非公開");
    expect(admin).toContain("自分だけに表示");
  });
});
