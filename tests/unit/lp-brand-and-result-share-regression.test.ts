import { describe, expect, test } from "vitest";
import { readFileSync } from "node:fs";

const index = readFileSync("pages/index.html", "utf8");
const install = readFileSync("pages/install.html", "utf8");
const css = readFileSync("public/styles.css", "utf8");
const lpCss = readFileSync("public/lp-refresh.css", "utf8");

describe("LP brand/icon and result share regression", () => {
  test("uses the selected ICON BOX QR artwork for LP QR affordances", () => {
    expect(index).toContain("/assets/qr-code-icon.svg?v=__ASSET_VERSION__");
    expect(install).toContain("/assets/qr-code-icon.svg?v=__ASSET_VERSION__");
  });

  test("footer wordmark keeps SIGN white and TRAINER green", () => {
    expect(lpCss).toContain(".lp-refresh .lp-footer .brand-sign { color:#fff; }");
    expect(lpCss).toContain(".lp-refresh .lp-footer .brand-trainer { color:#21c77a; }");
  });


  test("LP step 2 uses sign categories and the revealed answer stays self-judged", () => {
    expect(index).toContain("バッティングサイン");
    expect(index).toContain("走塁サイン");
    expect(index).toContain("守備サイン");
    expect(index).toContain("正解：ヒットエンドラン");
  });

  test("tablet footer remains text navigation instead of pill buttons", () => {
    expect(lpCss).toContain("@media (max-width:1100px)");
    expect(lpCss).toContain("border-radius:0 !important");
    expect(lpCss).toContain("background:transparent !important");
  });

  test("locked practice result share never squeezes heading into a narrow desktop column", () => {
    expect(css).toContain(".practice-result-share--locked { grid-template-columns: minmax(0, 1fr); align-items: stretch; }");
  });
});
