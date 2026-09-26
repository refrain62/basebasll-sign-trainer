import { describe, expect, test } from "vitest";
import { readFileSync } from "node:fs";

const index = readFileSync("pages/index.html", "utf8");
const plans = readFileSync("pages/plans.html", "utf8");
const install = readFileSync("pages/install.html", "utf8");
const css = readFileSync("public/styles.css", "utf8");

describe("LP information architecture regression", () => {
  test("top LP keeps core information and sends details to sub pages", () => {
    expect(index).toContain('id="capabilities"');
    expect(index).toContain('id="howto"');
    expect(index).toContain('id="share"');
    expect(index).toContain('id="pricing"');
    expect(index).toContain('id="for-team"');
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

  test("secondary pages use the same hamburger navigation", () => {
    for (const page of [plans, install]) {
      expect(page).toContain('id="mobile-menu-button"');
      expect(page).toContain('id="mobile-nav"');
    }
  });

  test("footer is logo-free and mobile secondary CTA stays readable", () => {
    expect(index).toContain('class="site-footer reference-footer lp-footer"');
    expect(index.match(/<footer[\s\S]*?<\/footer>/)?.[0]).not.toContain('brand-icon-img');
    expect(css).toContain('.mobile-nav .button.button-secondary { color:#082844 !important; background:#fff !important;');
  });
});
