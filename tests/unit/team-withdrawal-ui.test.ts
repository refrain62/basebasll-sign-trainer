import { describe, expect, test } from "vitest";
import { readFileSync } from "node:fs";

const adminSource = readFileSync("client/admin.ts", "utf8");
const controllerSource = readFileSync("src/controllers/team-admin-controller.ts", "utf8");
const routeSource = readFileSync("src/routes/team-admin.ts", "utf8");
const styles = readFileSync("public/styles.css", "utf8");
const entrySource = readFileSync("client/admin-entry.ts", "utf8");
const pagesSource = readFileSync("src/http/pages.ts", "utf8");

describe("team withdrawal and admin header regressions", () => {
  test("team settings provides an explicit withdrawal flow", () => {
    expect(adminSource).toContain("チームの退会");
    expect(adminSource).toContain('id="open-team-withdraw"');
    expect(adminSource).toContain('id="team-withdraw-form"');
    expect(adminSource).toContain('confirm: confirmInput?.value');
    expect(routeSource).toContain('teamAdminRoutes.delete("/team"');
    expect(controllerSource).toContain("teamAdminDeleteTeam");
    expect(controllerSource).toContain("owner_required");
  });

  test("team menu visibly includes the team name and logout", () => {
    expect(adminSource).toContain('class="team-admin-menu-team-context"');
    expect(adminSource).toContain('<span>チーム名</span>');
    expect(adminSource).toContain('id="team-menu-logout"');
  });

  test("activity page remains routable", () => {
    expect(entrySource).toContain("activity|groups|signs");
    expect(pagesSource).toContain("activity|groups|signs");
  });

  test("mobile sign-group cards retain horizontal breathing room", () => {
    expect(styles).toContain(".admin-card--flush-mobile .admin-group-list");
    expect(styles).toContain("width: calc(100% - 24px);");
    expect(styles).toContain("margin-left: 12px;");
  });
});
