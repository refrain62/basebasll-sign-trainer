import { describe, expect, test } from "vitest";
import { readFileSync } from "node:fs";

const adminSource = readFileSync("client/admin.ts", "utf8");
const teamSource = readFileSync("client/team.ts", "utf8");
const styles = readFileSync("public/styles.css", "utf8");

const teamAdminSource = adminSource.split("// ---------------- Team admin ----------------")[1] || "";

describe("dashboard lower information layout regression", () => {
  test("activity is placed after the primary team-admin menu destinations", () => {
    const navStart = teamAdminSource.indexOf("const TEAM_ADMIN_NAV = [");
    const navEnd = teamAdminSource.indexOf("] as const;", navStart);
    const nav = teamAdminSource.slice(navStart, navEnd);
    expect(nav.indexOf('label: "最近のアクティビティ"')).toBeGreaterThan(nav.indexOf('label: "チーム設定"'));
  });

  test("dashboard keeps notices and activity together in the lower area", () => {
    expect(teamAdminSource).toContain('class="team-admin-dashboard-lower-grid"');
    const lowerStart = teamAdminSource.indexOf('class="team-admin-dashboard-lower-grid"');
    const lower = teamAdminSource.slice(lowerStart, lowerStart + 5000);
    expect(lower.indexOf("<h2>システムのお知らせ</h2>")).toBeGreaterThanOrEqual(0);
    expect(lower.indexOf("<h2>最近のアクティビティ</h2>")).toBeGreaterThan(lower.indexOf("<h2>システムのお知らせ</h2>"));
    expect(styles).toContain("@media (min-width: 900px)");
    expect(styles).toContain("grid-template-columns: minmax(0, 1fr) minmax(0, 1fr)");
  });
});

describe("practice empty state regression", () => {
  test("an authenticated team with no signs gets a calm waiting state instead of a communication error", () => {
    expect(teamSource).toContain("if (!state.signs.length) {");
    expect(teamSource).toContain("renderPracticeEmptyState();");
    expect(teamSource).toContain("まだ練習データがありません");
    expect(teamSource).toContain("管理者がサインを登録すると、ここから練習できるようになります。");
    expect(teamSource).toContain("登録状況を確認する");
    expect(teamSource).not.toContain('throw new Error("no signs")');
    expect(styles).toContain(".practice-empty-state-panel");
  });
});
