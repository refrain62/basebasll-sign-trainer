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
    expect(account).toContain("基本の管理者名を確認してください");
    expect(account).toContain("基本名を確認・変更する");
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

  it("supports a different administrator display name for each team", () => {
    const migration = read("migrations/0024_team_admin_display_name.sql");
    const repository = read("src/repositories/admin-membership-repository.ts");
    const service = read("src/services/admin-membership-service.ts");
    const admin = read("client/admin.ts");
    expect(migration).toContain("ALTER TABLE team_admin_memberships ADD COLUMN display_name TEXT");
    expect(repository).toContain("team_admin_memberships.display_name");
    expect(repository).toContain("adminDisplayName");
    expect(service).toContain("updateOwnDisplayName");
    expect(admin).toContain("このチームでの名前を変更");
    expect(admin).toContain("太郎・花子 父");
  });

  it("keeps team-specific admin name controls readable and easy to operate", () => {
    const account = read("client/account.ts");
    const styles = read("public/styles.css");
    expect(account).toContain("account-team-admin-name-label");
    expect(account).toContain("account-team-admin-name-scope");
    expect(account).toContain("名前を変更");
    expect(styles).toContain(".account-inline-edit { min-height: 38px; min-width: 82px;");
    expect(styles).toContain(".account-team-admin-name strong { color: #173e55; font-size: 14px;");
  });

});
