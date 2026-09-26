import { describe, expect, test } from "vitest";
import { readFileSync } from "node:fs";

const adminSource = readFileSync("client/admin.ts", "utf8");
const styles = readFileSync("public/styles.css", "utf8");

describe("team admin sign management and mobile cards", () => {
  test("sign management exposes both group and sign creation actions", () => {
    const start = adminSource.indexOf("function teamSignsContent");
    const end = adminSource.indexOf("function teamShareContent", start);
    const source = adminSource.slice(start, end);
    expect(source).toContain('id="open-add-group"');
    expect(source).toContain("＋ グループ追加");
    expect(source).toContain('id="open-add-sign"');
    expect(source).toContain("＋ サインを追加");
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
    const desktopSummary = styles.slice(0, styles.indexOf("@media (max-width: 620px)"));
    expect(desktopSummary).not.toContain(".admin-card--flush-mobile > .team-admin-page-summary");
  });

});
