import { describe, expect, test } from "vitest";
import { readFileSync } from "node:fs";

const index = readFileSync("pages/index.html", "utf8");
const plans = readFileSync("pages/plans.html", "utf8");
const install = readFileSync("pages/install.html", "utf8");
const css = readFileSync("public/styles.css", "utf8");
const sharedHeader = readFileSync("pages/components/site-header.html", "utf8");
const sharedFooter = readFileSync("pages/components/site-footer.html", "utf8");

describe("LP information architecture regression", () => {
  test("top LP keeps core information and sends details to sub pages", () => {
    expect(index).toContain('id="capabilities"');
    expect(index).toContain('id="howto"');
    expect(index).toContain('id="share"');
    expect(index).toContain('id="pricing"');
    expect(index).toContain('id="for-team"');
    expect(index).toContain('id="for-player"');
    expect(index).toContain("こんな選手におすすめ");
    expect(index).toContain("サインを早く覚えたい");
    expect(index).toContain("試合で迷わず動けるようになりたい");
    expect(index).toContain("もっと野球を楽しみたい");
    expect(index).toContain('href="/plans"');
    expect(index).toContain('href="/install"');
    expect(index).toContain('href="/support"');
    expect(index).not.toContain('id="faq"');
    expect(index).not.toContain('id="operation"');
  });

  test("plan page uses a circle-and-dash comparison table", () => {
    expect(plans).toContain('class="plan-comparison-table"');
    expect(plans).toContain('class="plan-ok">○');
    expect(plans).toContain('class="plan-no">－');
    expect(plans).toContain('id="analytics"');
  });

  test("LP pages use the shared hamburger navigation component", () => {
    for (const page of [index, plans, install]) {
      expect(page).toContain("<!-- SITE_HEADER -->");
    }
    expect(sharedHeader).toContain('id="mobile-menu-button"');
    expect(sharedHeader).toContain('id="mobile-nav"');
  });

  test("footer is shared, logo-icon-free, and mobile secondary CTA stays readable", () => {
    expect(index).toContain("<!-- SITE_FOOTER -->");
    expect(sharedFooter).toContain('class="site-footer reference-footer lp-footer"');
    expect(sharedFooter).not.toContain('brand-icon-img');
    expect(css).toContain('.mobile-nav .button.button-secondary { color:#082844 !important; background:#fff !important;');
  });
});
