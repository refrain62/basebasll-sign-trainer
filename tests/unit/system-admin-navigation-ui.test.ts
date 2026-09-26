import { describe, expect, test } from "vitest";
import { readFileSync } from "node:fs";
import { isSystemAdminPath } from "../../src/security/request-guards.ts";
import { pageAssetForPath } from "../../src/http/pages.ts";

const adminSource = readFileSync("client/admin.ts", "utf8");
const entrySource = readFileSync("client/admin-entry.ts", "utf8");
const systemAdminSource = adminSource.split("// ---------------- System admin ----------------")[1]?.split("// ---------------- Team admin ----------------")[0] || "";

const systemPaths = ["/admin", "/admin/teams", "/admin/security", "/admin/notices"];

describe("system admin navigation UI regression", () => {
  test("system administration is split into purpose-specific pages", () => {
    for (const label of ["ダッシュボード", "チーム管理", "データ保護", "システムのお知らせ"]) {
      expect(systemAdminSource).toContain(`label: "${label}"`);
    }
    for (const path of systemPaths) {
      expect(pageAssetForPath(path)).toBe("/__pages/admin.txt");
      expect(isSystemAdminPath(path)).toBe(true);
    }
    expect(entrySource).toContain("teams|security|notices");
  });

  test("system administration uses the same header hamburger menu pattern as team administration", () => {
    expect(systemAdminSource).toContain('adminHeaderMenuButton("system-admin-menu-open", "system-admin-mobile-menu-screen")');
    expect(systemAdminSource).toContain('id="system-admin-mobile-menu-screen"');
    expect(systemAdminSource).toContain('id="system-admin-mobile-menu-screen"');
    expect(systemAdminSource).toContain("data-system-admin-menu-close");
    expect(adminSource).toContain('adminHeaderMenuButton("system-admin-menu-open", "system-admin-mobile-menu-screen")');
  });

  test("system dashboard stays summary-only while detailed operations live on dedicated pages", () => {
    const dashboardStart = systemAdminSource.indexOf("function systemDashboardContent");
    const teamsStart = systemAdminSource.indexOf("function systemTeamsContent");
    const dashboard = systemAdminSource.slice(dashboardStart, teamsStart);
    expect(dashboard).toContain("全体状況だけを確認して");
    expect(dashboard).not.toContain('id="create-team-open"');
    expect(dashboard).not.toContain('id="protect-data-now"');
    expect(systemAdminSource).toContain('id="create-team-open"');
    expect(systemAdminSource).toContain('id="protect-data-now"');
  });

  test("system admin does not duplicate English and Japanese section labels", () => {
    expect(systemAdminSource).not.toContain('<p class="admin-kicker">SYSTEM ADMIN</p>');
    expect(systemAdminSource).not.toContain('<p class="admin-kicker">DATA PROTECTION</p>');
    expect(systemAdminSource).not.toContain('<p class="admin-kicker">TEAMS</p>');
    expect(systemAdminSource).not.toContain('kicker: "NEW TEAM"');
    expect(systemAdminSource).not.toContain('kicker: "TEAM SETTINGS"');
  });
});
