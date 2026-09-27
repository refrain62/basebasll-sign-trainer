import { describe, expect, test } from "vitest";
import { readFileSync } from "node:fs";

const pricing = readFileSync("pages/components/pricing-cards.html", "utf8");
const cta = readFileSync("pages/components/lp-footer-cta.html", "utf8");
const index = readFileSync("pages/index.html", "utf8");
const plans = readFileSync("pages/plans.html", "utf8");
const admin = readFileSync("client/admin.ts", "utf8");

describe("shared marketing components", () => {
  test("top LP and plans share the same pricing card component", () => {
    expect(index).toContain("<!-- PRICING_CARDS_START -->");
    expect(index).toContain("data-shared-pricing-cards");
    expect(plans).toContain("<!-- PRICING_CARDS_START -->");
    expect(plans).toContain("data-shared-pricing-cards");
    expect(pricing).toContain("¥550");
    expect(pricing).toContain("¥1,100");
  });

  test("public LP pages can share one pre-footer CTA", () => {
    expect(cta).toContain("今すぐ、チームのサイン練習をはじめよう");
    for (const name of ["index","plans","install","support","terms","privacy","external-transmission","legal","contact"]) {
      const page = readFileSync(`pages/${name}.html`, "utf8");
      expect(page).toContain("<!-- LP_FOOTER_CTA_START -->");
      expect(page).toContain("今すぐ、チームのサイン練習をはじめよう");
    }
  });

  test("player recommendation follows team recommendation on the LP", () => {
    expect(index.indexOf('id="for-team"')).toBeGreaterThan(-1);
    expect(index.indexOf('id="for-player"')).toBeGreaterThan(index.indexOf('id="for-team"'));
  });

  test("team withdrawal action is nested below the explanation", () => {
    expect(admin).toContain('class="team-withdraw-actions"');
    expect(admin).toMatch(/<p>\$\{esc\(withdrawHelp\)\}<\/p><div class="team-withdraw-actions">/);
  });
});
