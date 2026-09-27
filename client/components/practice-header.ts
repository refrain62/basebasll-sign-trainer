export type PracticeHeaderView = "practice" | "history" | "analytics";

export type PracticeHeaderProps = {
  brandHtml: string;
  actionHtml?: string;
  teamName: string;
  activeView: PracticeHeaderView;
  analyticsBadgeHtml?: string;
  icons: {
    menu: string;
    close: string;
    play: string;
    clock: string;
    chart: string;
    share: string;
    logout: string;
  };
};

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function practiceHeader({
  brandHtml,
  actionHtml = "",
  teamName,
  activeView,
  analyticsBadgeHtml = "",
  icons
}: PracticeHeaderProps): string {
  return `<header class="app-topbar app-topbar--modern practice-app-header" data-header-component="practice"><div class="app-topbar-inner">${brandHtml}<div class="practice-header-actions">${actionHtml}<button class="mobile-menu-button practice-header-menu-button" id="practice-menu-button" type="button" aria-label="メニューを開く" aria-controls="practice-header-menu" aria-expanded="false">${icons.menu}</button></div></div></header><nav class="practice-header-menu" id="practice-header-menu" aria-label="練習ページメニュー" role="dialog" aria-modal="true" hidden>
    <header class="practice-header-menu-head"><div><span>チーム練習</span><strong>${escapeHtml(teamName || "サイン練習チーム")}</strong></div><button class="practice-header-menu-close" type="button" data-practice-menu-close aria-label="メニューを閉じる">${icons.close}</button></header>
    <div class="practice-header-menu-list">
      <button class="practice-header-menu-link ${activeView === "practice" ? "is-active" : ""}" type="button" data-practice-menu-action="practice"><span class="practice-header-menu-icon">${icons.play}</span><span>練習ページ</span><span class="practice-header-menu-arrow">›</span></button>
      <button class="practice-header-menu-link ${activeView === "history" ? "is-active" : ""}" type="button" data-practice-menu-action="history"><span class="practice-header-menu-icon">${icons.clock}</span><span>練習履歴</span><span class="practice-header-menu-arrow">›</span></button>
      <button class="practice-header-menu-link ${activeView === "analytics" ? "is-active" : ""}" type="button" data-practice-menu-action="analytics"><span class="practice-header-menu-icon">${icons.chart}</span><span>成績分析</span>${analyticsBadgeHtml}<span class="practice-header-menu-arrow">›</span></button>
      <button class="practice-header-menu-link" type="button" data-practice-menu-action="share"><span class="practice-header-menu-icon">${icons.share}</span><span>チームに共有</span><span class="practice-header-menu-arrow">›</span></button>
    </div>
    <div class="practice-header-menu-footer"><button class="practice-header-menu-link practice-header-menu-link--danger" type="button" data-practice-menu-action="logout"><span class="practice-header-menu-icon">${icons.logout}</span><span>この端末の認証を解除</span><span class="practice-header-menu-arrow">›</span></button></div>
  </nav>`;
}
