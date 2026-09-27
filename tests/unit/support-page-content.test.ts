import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const support = readFileSync("pages/support.html", "utf8");
const footer = readFileSync("pages/components/site-footer.html", "utf8");
const cta = readFileSync("pages/components/lp-footer-cta.html", "utf8");

describe("support marketing page", () => {
  it("uses よくある質問 consistently and removes the guide section", () => {
    expect(support).toContain("<title>よくある質問 | SIGN TRAINER</title>");
    expect(support).toContain('id="faq-page-title">よくある質問</h1>');
    expect(support).not.toContain("<h2>運用ガイド</h2>");
    expect(footer).toContain('href="/support">よくある質問</a>');
  });

  it("keeps coach voices and uses only the shared footer CTA", () => {
    expect(support).toContain("コーチの声");
    expect(support).toContain("faq-coach-team.webp");
    expect(support).not.toContain("fidelity-cta-band");
    expect(support).toContain("<!-- LP_FOOTER_CTA_START -->");
    expect(cta).toContain("今すぐ、チームのサイン練習をはじめよう");
  });

  it("removes keyword search and provides a substantial capability-based FAQ", () => {
    expect(support).not.toContain("faq-search-bar");
    expect(support).not.toContain("キーワードで検索");
    expect((support.match(/<details/g) || []).length).toBeGreaterThanOrEqual(25);
    expect(support).toContain("YouTubeやYouTube Shortsの動画を登録できますか？");
    expect(support).toContain("クイズは自動で正解・不正解を判定しますか？");
    expect(support).toContain("練習結果をLINEなどで共有できますか？");
    expect(support).toContain("同じ人が複数チームの管理者になれますか？");
  });
});
