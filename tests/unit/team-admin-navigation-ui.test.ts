import { describe, expect, test } from "vitest";
import { readFileSync } from "node:fs";

const adminSource = readFileSync("client/admin.ts", "utf8");
const styles = readFileSync("public/styles.css", "utf8");
const teamAdminSource = adminSource.split("// ---------------- Team admin ----------------")[1] || "";

describe("team admin navigation UI regression", () => {
  test("administration uses a hamburger button and a menu panel", () => {
    expect(adminSource).toContain('adminHeaderMenuButton("team-admin-menu-open", "team-admin-mobile-menu-screen")');
    expect(adminSource).toContain('id="team-admin-mobile-menu-screen"');
    expect(adminSource).toContain('id="team-admin-mobile-menu-screen"');
    expect(adminSource).toContain('data-team-admin-menu-close');
    expect(adminSource).not.toContain('id="team-admin-mobile-nav"');
    expect(styles).toContain('.team-admin-mobile-menu-screen:not([hidden])');
    expect(styles).toContain('.admin-topbar .admin-header-menu-button');
  });

  test("team admin navigation is Japanese-only instead of duplicated English labels", () => {
    expect(adminSource).toContain('<div class="team-admin-sidebar-team"><span>チーム管理</span>');
    expect(teamAdminSource).not.toContain('<p class="admin-kicker">TEAM ADMIN</p>');
    expect(teamAdminSource).not.toContain('<p class="admin-kicker">PLAN & AUTH</p>');
    expect(teamAdminSource).not.toContain('<p class="admin-kicker">GROUPS</p>');
    expect(teamAdminSource).not.toContain('<p class="admin-kicker">SIGNS</p>');
    expect(teamAdminSource).not.toContain('<p class="admin-kicker">ADMINISTRATORS</p>');
    expect(teamAdminSource).not.toContain('<p class="admin-kicker">TEAM SETTINGS</p>');
  });

  test("all existing team-admin destinations remain available in the menu", () => {
    for (const label of ["ダッシュボード", "最近のアクティビティ", "サイングループ", "サイン管理", "共有", "管理者", "プラン・認証", "システムのお知らせ", "チーム設定"]) {
      expect(teamAdminSource).toContain(`label: "${label}"`);
    }
  });
});
