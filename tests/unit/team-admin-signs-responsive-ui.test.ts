import { describe, expect, test } from "vitest";
import { readFileSync } from "node:fs";

const adminSource = readFileSync("client/admin.ts", "utf8");
const styles = readFileSync("public/styles.css", "utf8");

describe("team admin sign management and mobile cards", () => {
  test("sign management defaults to all signs and can filter by group", () => {
    const start = adminSource.indexOf("function selectedSignGroupKey");
    const end = adminSource.indexOf("function teamShareContent", start);
    const source = adminSource.slice(start, end);
    expect(source).toContain('if (!requested || requested === "all") return "all"');
    expect(source).toContain('id="sign-group-filter"');
    expect(source).toContain('value="all"');
    expect(source).toContain("すべてのサイン（${signs.length}）");
    expect(source).toContain('id="sign-search"');
    expect(source).toContain('id="open-add-sign"');
    expect(source).toContain("visibleSigns");
  });

  test("sign list uses one prominent total instead of repeating the selected group name", () => {
    const start = adminSource.indexOf("function teamSignsContent");
    const end = adminSource.indexOf("function teamShareContent", start);
    const source = adminSource.slice(start, end);
    expect(source).toContain('class="team-sign-total-label"');
    expect(source).toContain('全<span id="sign-visible-count"');
    expect(source).not.toContain("選択中のグループ");
    expect(styles).toContain(".team-sign-total-label");
    expect(styles).toContain("font-size: clamp(24px, 3vw, 32px)");
  });

  test("new sign modal preselects the filtered group while editing can still change it", () => {
    expect(adminSource).toContain("function openSignModal(teamId, groups, sign = null, defaultGroupId = null)");
    expect(adminSource).toContain("const selectedGroupId = editing ? sign?.groupId : defaultGroupId");
    expect(adminSource).toContain('name="groupId"');
    expect(adminSource).toContain("Number(selectedGroupId) === Number(g.id)");
  });

  test("mobile dashboard keeps the three summary cards in one row", () => {
    expect(styles).toContain("grid-template-columns: repeat(3,minmax(0,1fr));");
    expect(styles).not.toContain(".team-admin-summary-strip { grid-template-columns: 1fr; gap: 8px; }");
  });

  test("mobile list cards use the full available width without child-content squeeze", () => {
    expect(styles).toContain(".admin-group-card,\n.admin-sign-card--summary,\n.admin-video-row--summary");
    expect(styles).toContain("box-sizing: border-box;");
    expect(styles).toContain("grid-template-columns: minmax(0, 1fr) auto;");
    expect(styles).toContain(".admin-group-actions .button:last-child");
    expect(styles).toContain("min-width: 86px;");
  });

  test("mobile page summary keeps horizontal breathing room without changing desktop spacing", () => {
    expect(styles).toContain(".admin-card--flush-mobile > .team-admin-page-summary {\n    padding-inline: 15px;");
  });
});
