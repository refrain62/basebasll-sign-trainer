import { describe, expect, test } from "vitest";
import { readFileSync } from "node:fs";

const header = readFileSync("pages/components/site-header.html", "utf8");
const footer = readFileSync("pages/components/site-footer.html", "utf8");
const pages = ["index", "install", "plans", "support", "privacy", "terms", "external-transmission"];

describe("public LP site chrome", () => {
  test("all LP pages and legal subpages consume the same header/footer components", () => {
    for (const pageName of pages) {
      const page = readFileSync(`pages/${pageName}.html`, "utf8");
      expect(page).toContain("<!-- SITE_HEADER_START -->");
      expect(page).toContain("<!-- SITE_FOOTER_START -->");
    }
  });

  test("shared header matches LP navigation", () => {
    expect(header).toContain('href="/#capabilities">できること</a>');
    expect(header).toContain('href="/plans">料金プラン</a>');
    expect(header).toContain('href="/install">はじめ方</a>');
    expect(header).toContain('href="/support">よくある質問</a>');
    expect(header).toContain('class="header-login" href="/account">チーム管理者ログイン</a>');
    expect(header).toContain('id="mobile-menu-button"');
  });

  test("team member practice pages also consume the shared footer", () => {
    const team = readFileSync("pages/team.html", "utf8");
    expect(team).toContain("<!-- SITE_FOOTER_START -->");
  });

  test("shared footer matches LP navigation", () => {
    expect(footer).toContain('href="/plans">料金プラン</a>');
    expect(footer).toContain('href="/install">はじめ方</a>');
    expect(footer).toContain('href="/support">よくある質問</a>');
    expect(footer).toContain('href="/terms">利用規約</a>');
    expect(footer).toContain('href="/privacy">プライバシーポリシー</a>');
  });

  test("legal pages load the LP chrome stylesheet", () => {
    for (const pageName of ["privacy", "terms", "external-transmission"]) {
      const page = readFileSync(`pages/${pageName}.html`, "utf8");
      expect(page).toContain('/lp-refresh.css?v=__ASSET_VERSION__');
      expect(page).toContain('class="site-shell lp-v2 lp-refresh secondary-page legal-lp"');
    }
  });
});
