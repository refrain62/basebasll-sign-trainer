export type SystemAdminHeaderProps = {
  iconUrl: string;
  actionHtml?: string;
};

export function systemAdminHeader({ iconUrl, actionHtml = "" }: SystemAdminHeaderProps): string {
  return `<header class="app-topbar admin-topbar system-admin-header" data-header-component="system-admin"><div class="app-topbar-inner">
    <a class="brand" href="/" aria-label="SIGN TRAINER トップページ"><span class="brand-mark"><img class="brand-icon-img" src="${iconUrl}" alt="" width="128" height="128"></span><span class="brand-copy"><span class="brand-name"><span class="brand-sign">SIGN</span> <span class="brand-trainer">TRAINER</span></span><span class="brand-sub">野球のサインを、チームの力に。</span></span></a>
    ${actionHtml}
  </div></header>`;
}
