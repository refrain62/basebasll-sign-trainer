import { describe, expect, test } from "vitest";
import { readFileSync } from "node:fs";

const adminSource = readFileSync("client/admin.ts", "utf8");
const styles = readFileSync("public/styles.css", "utf8");

describe("admin header and navigation icon regression", () => {
  test("white admin header carries the product tagline", () => {
    expect(adminSource).toContain("野球のサインを、チームの力に。");
  });

  test("system and team admin headers expose notices beside the hamburger menu", () => {
    expect(adminSource).toContain("function adminHeaderActions");
    expect(adminSource).toContain('systemAdminHref("notices"), notices.length');
    expect(adminSource).toContain('teamAdminHref(teamId, "notices"), notices.length');
    expect(adminSource).toContain('class="admin-header-notices-badge"');
    expect(styles).toContain(".admin-header-notices-link");
  });


  test("team admin menu shows the team name only once in its heading", () => {
    expect(adminSource).toContain('<span>チーム管理</span><strong>${esc(teamName)}</strong>');
    expect(adminSource).not.toContain("team-admin-menu-team-context");
  });

  test("admin navigation uses recognizable SVG icons instead of abstract glyphs", () => {
    for (const icon of ["dashboard", "activity", "groups", "signs", "share", "admins", "plan", "notices", "settings", "teams", "security"]) {
      expect(adminSource).toContain(`${icon}: \`<svg`);
    }
    expect(adminSource).toContain("${adminNavIcon(item.icon)}");
    expect(styles).toContain(".admin-nav-svg");
  });
});
