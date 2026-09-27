export type TeamAdminHeaderProps = {
  iconUrl: string;
  actionHtml?: string;
};

export function teamAdminHeader({ iconUrl, actionHtml = "" }: TeamAdminHeaderProps): string {
  return `<header class="app-topbar admin-topbar team-admin-app-header" data-header-component="team-admin"><div class="app-topbar-inner">
    <a class="brand" href="/" aria-label="SIGN TRAINER トップページ"><span class="brand-mark"><img class="brand-icon-img" src="${iconUrl}" alt="" width="128" height="128"></span><span class="brand-copy"><span class="brand-name"><span class="brand-sign">SIGN</span> <span class="brand-trainer">TRAINER</span></span><span class="brand-sub">野球のサインを、チームの力に。</span></span></a>
    ${actionHtml}
  </div></header>`;
}
