import { describe, expect, test } from "vitest";
import { readFileSync } from "node:fs";

const teamSource = readFileSync("client/team.ts", "utf8");
const lpSource = readFileSync("pages/index.html", "utf8");
const styles = readFileSync("public/styles.css", "utf8");

describe("practice header and history", () => {
  test("practice and LP share the current brand tagline", () => {
    expect(teamSource).toContain("野球のサインを、チームの力に。");
    expect(lpSource).toContain("野球のサインを、チームの力に。");
    expect(teamSource).toContain('id="practice-menu-button"');
    expect(teamSource).toContain('id="practice-header-menu"');
  });

  test("up to 50 practice history records are paged ten at a time", () => {
    expect(teamSource).toContain("const HISTORY_LIMIT = 50");
    expect(teamSource).toContain("const pageSize = 10");
    expect(teamSource).toContain('id="history-prev"');
    expect(teamSource).toContain('id="history-next"');
    expect(styles).toContain(".history-pagination");
  });
});
