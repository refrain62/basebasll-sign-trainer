// Source of truth: TypeScript. Vite generates content-hashed browser bundles under public/build/.
import { qrImageUrl, teamUrl } from "./share-utils";

const TERMS_VERSION = "2026-09-25";
const PRIVACY_VERSION = "2026-09-25";

const app = document.querySelector("#app");

type AdminModalOptions = {
  title?: string;
  kicker?: string;
  body?: string;
  wide?: boolean;
  onOpen?: (layer: HTMLDivElement) => void;
};

type JsonRecord = Record<string, any>;
const ICON = `/assets/sign-trainer-icon.webp?v=${encodeURIComponent(__APP_VERSION__)}`;

const PAID_LIMITED_MESSAGE = "Plus / Proは現在、特定チーム限定で提供しています。一般のお申し込み・オンライン課金にはまだ対応していません。";

function featureEnabled(entitlements, key) {
  return Boolean(entitlements?.[key]?.enabled);
}

function paidFeatureBadge(label = "限定") {
  return `<span class="paid-feature-badge">${esc(label)}</span>`;
}

function limitedFeaturePanel(title, description = "") {
  return `<section class="admin-card paid-feature-panel"><div class="paid-feature-lock">${adminNavIcon("plan")}</div><div><span class="paid-feature-kicker">LIMITED FEATURE</span><h2>${esc(title)}</h2><p>${esc(description || "この機能は現在のプランでは利用できません。")}</p><strong>${esc(PAID_LIMITED_MESSAGE)}</strong></div></section>`;
}

function openLimitedFeatureModal(title, description = "") {
  openAdminModal({
    title,
    kicker: "LIMITED FEATURE",
    body: `<div class="paid-feature-modal"><div class="paid-feature-lock">${adminNavIcon("plan")}</div><p>${esc(description || "この機能は現在のプランでは利用できません。")}</p><div class="notice notice-info"><strong>現在は対象チーム限定で提供中です</strong><br>${esc(PAID_LIMITED_MESSAGE)}</div><button class="button button-secondary button-full" type="button" data-modal-close>閉じる</button></div>`
  });
}

function esc(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function shell(title, body, action = "") {
  document.title = `${title} | SIGN TRAINER`;
  app.innerHTML = `<div class="admin-page">
    <header class="app-topbar admin-topbar"><div class="app-topbar-inner">
      <a class="brand" href="/"><span class="brand-mark"><img class="brand-icon-img" src="${ICON}" alt="" width="128" height="128"></span><span class="brand-copy"><span class="brand-name"><span class="brand-sign">SIGN</span> <span class="brand-trainer">TRAINER</span></span><span class="brand-sub">野球のサインを、チームの力に。</span></span></a>
      ${action}
    </div></header>
    <main class="admin-main">${body}</main>
  </div>`;
}

function adminHeaderMenuButton(id, controls) {
  return `<button class="mobile-menu-button admin-header-menu-button" id="${esc(id)}" type="button" aria-label="管理メニューを開く" aria-controls="${esc(controls)}" aria-expanded="false"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></button>`;
}

function adminNavIcon(name: string, className = "admin-nav-svg") {
  const common = `class="${esc(className)}" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"`;
  const icons: Record<string, string> = {
    dashboard: `<svg ${common}><path d="M3.5 10.5 12 3.8l8.5 6.7v9.2a.8.8 0 0 1-.8.8h-5.2v-6.2h-5v6.2H4.3a.8.8 0 0 1-.8-.8z"/></svg>`,
    activity: `<svg ${common}><path d="M4.1 8.2A8.5 8.5 0 1 1 3.5 12"/><path d="M4 4.7v4.1h4.1"/><path d="M12 7.5v5l3.1 1.8"/></svg>`,
    groups: `<svg ${common}><path d="m12 3.5 8.5 4.6L12 12.7 3.5 8.1 12 3.5Z"/><path d="m3.5 12 8.5 4.6 8.5-4.6"/><path d="m3.5 15.9 8.5 4.6 8.5-4.6"/></svg>`,
    signs: `<svg ${common}><path d="M20.4 13.1 13 20.5 3.8 11.3V4h7.3l9.3 9.1Z"/><circle cx="8.2" cy="8.2" r="1.35"/></svg>`,
    share: `<svg ${common}><circle cx="18" cy="5" r="2.2"/><circle cx="6" cy="12" r="2.2"/><circle cx="18" cy="19" r="2.2"/><path d="m8 11 7.8-4.5M8 13l7.8 4.5"/></svg>`,
    admins: `<svg ${common}><path d="M16.5 20v-1.5a4 4 0 0 0-4-4h-5a4 4 0 0 0-4 4V20"/><circle cx="10" cy="7.5" r="3.2"/><path d="M17 10.8a3 3 0 0 1 3.5 2.9V20M16.5 4.7a3 3 0 0 1 0 5.7"/></svg>`,
    plan: `<svg ${common}><path d="M12 3.2 19.5 6v5.4c0 4.7-3 7.9-7.5 9.4-4.5-1.5-7.5-4.7-7.5-9.4V6L12 3.2Z"/><path d="m8.7 12 2.1 2.1 4.5-4.6"/></svg>`,
    settings: `<svg ${common}><path d="M4 6h7M15 6h5M4 12h3M11 12h9M4 18h9M17 18h3"/><circle cx="13" cy="6" r="2"/><circle cx="9" cy="12" r="2"/><circle cx="15" cy="18" r="2"/></svg>`,
    teams: `<svg ${common}><path d="M4 20v-1.6a4 4 0 0 1 4-4h3a4 4 0 0 1 4 4V20"/><circle cx="9.5" cy="7.7" r="3.1"/><path d="M16.8 10.8a3 3 0 0 1 3.7 2.9V20"/></svg>`,
    security: `<svg ${common}><path d="M12 3.2 19.5 6v5.4c0 4.7-3 7.9-7.5 9.4-4.5-1.5-7.5-4.7-7.5-9.4V6L12 3.2Z"/><path d="m8.8 12 2 2 4.5-4.5"/></svg>`,
    notices: `<svg ${common}><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 8.5h18C21 15 18 15 18 8Z"/><path d="M9.5 20h5"/></svg>`
  };
  return icons[name] || icons.dashboard;
}

function adminHeaderActions(menuButton: string, noticesHref: string, noticeCount = 0) {
  const count = Math.max(0, Number(noticeCount || 0));
  const badge = count > 99 ? "99+" : String(count);
  return `<div class="admin-header-actions"><a class="admin-header-notices-link" href="${esc(noticesHref)}" aria-label="お知らせ ${count}件">${adminNavIcon("notices", "admin-header-notices-icon")}<span class="admin-header-notices-label">お知らせ</span><span class="admin-header-notices-badge" aria-hidden="true">${badge}</span></a>${menuButton}</div>`;
}

function notice(message, kind = "info") {
  return `<div class="admin-notice admin-notice--${esc(kind)}" role="status">${esc(message)}</div>`;
}

function pagerControls(total, pageSize, label = "一覧") {
  if (total <= pageSize) return "";
  const totalPages = Math.ceil(total / pageSize);
  return `<nav class="admin-pagination" data-pager-controls aria-label="${esc(label)}のページ切り替え"><p class="admin-pagination-range"><strong data-pager-range>1〜${Math.min(pageSize, total)}</strong><span data-pager-total> / 全${total}件</span></p><div class="admin-pagination-buttons"><button class="button button-secondary admin-pagination-button" type="button" data-pager-prev disabled>‹ 前へ</button><span class="admin-pagination-status" data-pager-status>1 / ${totalPages}ページ</span><button class="button button-secondary admin-pagination-button" type="button" data-pager-next>次へ ›</button></div></nav>`;
}

function pagedCollection(listHtml, total, { pageSize = 10, label = "一覧" } = {}) {
  if (!total) return listHtml;
  return `<div class="admin-paged-collection" data-paged-collection data-page-size="${pageSize}" data-total="${total}">${listHtml}${pagerControls(total, pageSize, label)}</div>`;
}

function wirePagedCollections(root: ParentNode = document) {
  root.querySelectorAll<HTMLElement>("[data-paged-collection]").forEach((container) => {
    const pageSize = Math.max(1, Number(container.dataset.pageSize || 10));
    const allItems = [...container.querySelectorAll<HTMLElement>("[data-page-item]")];
    const controls = container.querySelector<HTMLElement>("[data-pager-controls]");
    if (!allItems.length) return;
    const prev = controls?.querySelector<HTMLButtonElement>("[data-pager-prev]");
    const next = controls?.querySelector<HTMLButtonElement>("[data-pager-next]");
    const status = controls?.querySelector<HTMLElement>("[data-pager-status]");
    const range = controls?.querySelector<HTMLElement>("[data-pager-range]");
    const totalLabel = controls?.querySelector<HTMLElement>("[data-pager-total]");
    let page = 1;
    const renderPage = (scroll = false) => {
      const items = allItems.filter((item) => item.dataset.filteredOut !== "true");
      const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
      page = Math.min(page, totalPages);
      const start = (page - 1) * pageSize;
      const end = Math.min(start + pageSize, items.length);
      allItems.forEach((item) => { item.hidden = true; });
      items.forEach((item, index) => { item.hidden = index < start || index >= end; });
      if (status) status.textContent = `${page} / ${totalPages}ページ`;
      if (range) range.textContent = items.length ? `${start + 1}〜${end}` : "0";
      if (totalLabel) totalLabel.textContent = ` / 全${items.length}件`;
      if (prev) prev.disabled = page <= 1;
      if (next) next.disabled = page >= totalPages;
      if (controls) controls.hidden = items.length <= pageSize;
      if (scroll) container.scrollIntoView({ behavior: "smooth", block: "start" });
    };
    prev?.addEventListener("click", () => { if (page <= 1) return; page -= 1; renderPage(true); });
    next?.addEventListener("click", () => { const items = allItems.filter((item) => item.dataset.filteredOut !== "true"); const totalPages = Math.max(1, Math.ceil(items.length / pageSize)); if (page >= totalPages) return; page += 1; renderPage(true); });
    container.addEventListener("admin:filter-change", () => { page = 1; renderPage(false); });
    renderPage();
  });
}

let adminModalKeyHandler = null;
let adminModalRestoreFocus = null;
let teamAdminMenuKeyHandler: ((event: KeyboardEvent) => void) | null = null;
let teamAdminMenuRestoreFocus: Element | null = null;

function closeAdminModal() {
  const modal = document.querySelector("#admin-modal-layer");
  if (adminModalKeyHandler) document.removeEventListener("keydown", adminModalKeyHandler);
  adminModalKeyHandler = null;
  modal?.remove();
  document.body.classList.remove("admin-modal-open");
  if (app) app.inert = false;
  const restore = adminModalRestoreFocus;
  adminModalRestoreFocus = null;
  if (restore?.isConnected && typeof restore.focus === "function") restore.focus({ preventScroll: true });
}

function openAdminModal({ title, kicker = "", body = "", wide = false, onOpen }: AdminModalOptions = {}) {
  closeAdminModal();
  adminModalRestoreFocus = document.activeElement;
  const layer = document.createElement("div");
  layer.id = "admin-modal-layer";
  layer.className = "admin-modal-layer";
  layer.innerHTML = `<div class="admin-modal-backdrop" data-modal-close></div><section class="admin-modal ${wide ? "admin-modal--wide" : ""}" role="dialog" aria-modal="true" aria-labelledby="admin-modal-title"><div class="admin-modal-handle" aria-hidden="true"></div><header class="admin-modal-header"><div>${kicker ? `<p class="admin-kicker">${esc(kicker)}</p>` : ""}<h2 id="admin-modal-title">${esc(title || "編集")}</h2></div><button class="admin-modal-close" type="button" data-modal-close aria-label="閉じる">×</button></header><div class="admin-modal-body">${body}</div></section>`;
  document.body.appendChild(layer);
  document.body.classList.add("admin-modal-open");
  if (app) app.inert = true;
  layer.querySelectorAll("[data-modal-close]").forEach((el) => el.addEventListener("click", closeAdminModal));
  const dialog = layer.querySelector(".admin-modal");
  dialog?.addEventListener("click", (event) => event.stopPropagation());
  adminModalKeyHandler = (event: KeyboardEvent) => {
    if (event.key === "Escape") {
      event.preventDefault();
      closeAdminModal();
      return;
    }
    if (event.key !== "Tab") return;
    const focusable = [...layer.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])')]
      .filter((element) => !element.hidden && element.getClientRects().length);
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  };
  document.addEventListener("keydown", adminModalKeyHandler);
  requestAnimationFrame(() => layer.classList.add("is-open"));
  onOpen?.(layer);
  layer.querySelector("input, textarea, select, button")?.focus({ preventScroll: true });
  return layer;
}

function modalError(message) {
  const box = document.querySelector("#admin-modal-error");
  if (box) box.innerHTML = notice(message, "error");
}

function setButtonBusy(button, busy, busyLabel = "保存しています…") {
  if (!button) return;
  if (busy) {
    button.dataset.originalLabel = button.textContent;
    button.textContent = busyLabel;
    button.disabled = true;
  } else {
    button.textContent = button.dataset.originalLabel || button.textContent;
    button.disabled = false;
  }
}

async function requestJson(url: string, options: RequestInit = {}) {
  const response = await fetch(url, {
    cache: "no-store",
    ...options,
    headers: options.body ? { "content-type": "application/json", ...(options.headers || {}) } : (options.headers || {})
  });
  const data = await response.json().catch(() => ({}));
  return { response, data };
}

async function copyText(text, statusEl) {
  try {
    await navigator.clipboard.writeText(text);
    if (statusEl) statusEl.textContent = "コピーしました";
    return true;
  } catch {
    try {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.setAttribute("readonly", "");
      textarea.className = "clipboard-fallback";
      document.body.appendChild(textarea);
      textarea.select();
      const ok = document.execCommand("copy");
      textarea.remove();
      if (statusEl) statusEl.textContent = ok ? "コピーしました" : "コピーできませんでした。URLを長押ししてコピーしてください。";
      return ok;
    } catch {
      if (statusEl) statusEl.textContent = "コピーできませんでした。URLを長押ししてコピーしてください。";
      return false;
    }
  }
}

function teamShareMessage(teamName, playerUrl) {
  return `【SIGN TRAINER】\n${teamName}のサイン練習ページです。\n${playerUrl}\n\n合言葉はチーム内で別途確認してください。`;
}

async function shareTeamPage(teamName, playerUrl, statusEl) {
  const payload = {
    title: `${teamName} | SIGN TRAINER`,
    text: `【SIGN TRAINER】\n${teamName}のサイン練習ページです。合言葉はチーム内で別途確認してください。`,
    url: playerUrl
  };
  if (navigator.share) {
    try {
      await navigator.share(payload);
      if (statusEl) statusEl.textContent = "共有メニューを開きました";
      return;
    } catch (error) {
      if (error?.name === "AbortError") return;
      console.warn("share failed", error);
    }
  }
  const ok = await copyText(playerUrl, statusEl);
  if (ok && statusEl) statusEl.textContent = "共有メニュー非対応のため、参加リンクをコピーしました";
}

function shareTeamOnLine(teamName, playerUrl) {
  const message = teamShareMessage(teamName, playerUrl);
  window.open(`https://line.me/R/share?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
}

function formatDate(value) {
  if (!value) return "-";
  const d = new Date(value.includes("T") ? value : `${value.replace(" ", "T")}Z`);
  if (Number.isNaN(d.getTime())) return value;
  return new Intl.DateTimeFormat("ja-JP", { year: "numeric", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(d);
}

function relatedPageLinkAttrs() {
  const standalone = window.matchMedia?.("(display-mode: standalone)")?.matches || Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone);
  return standalone ? "" : ' target="_blank" rel="noopener noreferrer"';
}


function isValidAdminCredential(value) {
  const text = String(value || "").trim();
  return text.length >= 12 && text.length <= 200 && /[A-Za-z]/.test(text) && /[0-9]/.test(text);
}

function adminCredentialMessage() {
  return "12文字以上で、英字と数字をそれぞれ1文字以上含めてください。記号は必須ではありません。";
}

async function wireOAuthAvailability(root: ParentNode = document) {
  const links = [...root.querySelectorAll("[data-oauth-provider]")];
  if (!links.length) return;
  try {
    const { data } = await requestJson("/api/account/providers");
    const providers = data.providers || {};
    for (const link of links) {
      const enabled = Boolean(providers[link.dataset.oauthProvider]);
      link.classList.toggle("is-disabled", !enabled);
      link.setAttribute("aria-disabled", enabled ? "false" : "true");
      if (!enabled) { link.dataset.oauthHref = link.getAttribute("href") || ""; link.removeAttribute("href"); }
    }
  } catch {
    for (const link of links) link.classList.add("is-disabled");
  }
}

function adminOAuthButtons({ intent = "login", teamId = "", returnTo = "" } = {}) {
  const query = new URLSearchParams({ intent });
  if (teamId) query.set("teamId", teamId);
  if (returnTo) query.set("returnTo", returnTo);
  if (intent !== "reauth") {
    query.set("terms", TERMS_VERSION);
    query.set("privacy", PRIVACY_VERSION);
  }
  const suffix = intent === "reauth" ? "で本人確認" : "で続ける";
  return `<div class="admin-oauth-actions">
    <a class="button button-secondary admin-oauth-button" data-oauth-provider="google" href="/api/account/oauth/google/start?${query}">Google${suffix}</a>
    <a class="button admin-oauth-button admin-oauth-button--line" data-oauth-provider="line" href="/api/account/oauth/line/start?${query}">LINE${suffix}</a>
  </div>`;
}

function openFreshAuthModal(data, returnTo) {
  const destination = data?.returnTo || returnTo || location.pathname;
  const preferred = data?.provider ? `<p class="admin-help">前回の認証: ${esc(data.provider === "google" ? "Google" : "LINE")}</p>` : "";
  openAdminModal({
    title: "本人確認が必要です",
    kicker: "SECURITY CHECK",
    body: `<div class="admin-security-note"><strong>重要な操作を保護しています</strong><p>${esc(data?.message || "Google / LINEで本人確認をもう一度行ってください。")}</p></div>${preferred}${adminOAuthButtons({ intent: "reauth", returnTo: destination })}<p class="admin-help">認証後、この画面に戻ります。戻ったら操作をもう一度実行してください。</p>`,
    onOpen(layer) { wireOAuthAvailability(layer); }
  });
}

function handleFreshAuthResponse(response, data, returnTo) {
  if (response?.status !== 428 || data?.error !== "reauth_required") return false;
  openFreshAuthModal(data, returnTo);
  return true;
}

// ---------------- System admin ----------------
const SYSTEM_ADMIN_VIEWS = ["dashboard", "teams", "security", "notices"] as const;
type SystemAdminView = typeof SYSTEM_ADMIN_VIEWS[number];

const SYSTEM_ADMIN_NAV = [
  { view: "dashboard", label: "ダッシュボード", icon: "dashboard" },
  { view: "notices", label: "システムのお知らせ", icon: "notices" },
  { view: "teams", label: "チーム管理", icon: "teams" },
  { view: "security", label: "データ保護", icon: "security" }
] as const;

let systemAdminMenuKeyHandler: ((event: KeyboardEvent) => void) | null = null;
let systemAdminMenuRestoreFocus: Element | null = null;

function systemAdminViewFromPath(pathname = location.pathname): SystemAdminView {
  const clean = pathname.replace(/\/$/, "");
  if (clean === "/register") return "teams";
  const match = clean.match(/^\/admin(?:\/(teams|security|notices))?$/);
  const view = match?.[1] || "dashboard";
  return (SYSTEM_ADMIN_VIEWS as readonly string[]).includes(view) ? view as SystemAdminView : "dashboard";
}

function systemAdminHref(view: SystemAdminView = "dashboard") {
  return view === "dashboard" ? "/admin" : `/admin/${view}`;
}

function closeSystemAdminMobileMenu() {
  const menu = document.querySelector<HTMLElement>("#system-admin-mobile-menu-screen");
  const openButton = document.querySelector<HTMLButtonElement>("#system-admin-menu-open");
  if (systemAdminMenuKeyHandler) document.removeEventListener("keydown", systemAdminMenuKeyHandler);
  systemAdminMenuKeyHandler = null;
  menu?.setAttribute("hidden", "");
  openButton?.setAttribute("aria-expanded", "false");
  document.body.classList.remove("team-admin-menu-open");
  const restore = systemAdminMenuRestoreFocus as HTMLElement | null;
  systemAdminMenuRestoreFocus = null;
  if (restore?.isConnected && typeof restore.focus === "function") restore.focus({ preventScroll: true });
}

function openSystemAdminMobileMenu() {
  const menu = document.querySelector<HTMLElement>("#system-admin-mobile-menu-screen");
  const openButton = document.querySelector<HTMLButtonElement>("#system-admin-menu-open");
  if (!menu || !openButton) return;
  systemAdminMenuRestoreFocus = document.activeElement;
  menu.removeAttribute("hidden");
  openButton.setAttribute("aria-expanded", "true");
  document.body.classList.add("team-admin-menu-open");
  systemAdminMenuKeyHandler = (event: KeyboardEvent) => {
    if (event.key === "Escape") {
      event.preventDefault();
      closeSystemAdminMobileMenu();
      return;
    }
    if (event.key !== "Tab") return;
    const focusable = [...menu.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])')]
      .filter((element) => !element.hidden && element.getClientRects().length);
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  };
  document.addEventListener("keydown", systemAdminMenuKeyHandler);
  menu.querySelector<HTMLElement>("[data-system-admin-menu-close]")?.focus({ preventScroll: true });
}

function systemNoticeState(item) {
  if (item.status !== "published") return { label: "下書き", className: "draft" };
  const now = Date.now();
  const start = item.publish_at ? new Date(item.publish_at).getTime() : 0;
  const end = item.expires_at ? new Date(item.expires_at).getTime() : 0;
  if (start && start > now) return { label: "公開予約", className: "scheduled" };
  if (end && end < now) return { label: "公開終了", className: "expired" };
  return { label: "公開中", className: "published" };
}

function systemNoticeList(notices, { limit = 0, editable = false } = {}) {
  const rows = limit > 0 ? notices.slice(0, limit) : notices;
  if (!rows.length) return `<div class="admin-empty"><strong>お知らせはまだありません</strong><p>「お知らせを登録」から作成できます。</p></div>`;
  return `<div class="system-notice-list">${rows.map((item) => {
    const state = systemNoticeState(item);
    const kindLabel = { info: "お知らせ", update: "新機能", maintenance: "メンテナンス", important: "重要" }[item.kind] || "お知らせ";
    return `<article class="system-notice-item system-notice-item--${esc(item.kind)}" data-page-item><div class="system-notice-top"><div class="system-notice-badges"><span class="system-notice-kind">${kindLabel}</span><span class="system-notice-state system-notice-state--${state.className}">${state.label}</span></div><time>${esc(formatDate(item.publish_at || item.created_at))}</time></div><h3>${esc(item.title)}</h3><p>${esc(item.body)}</p>${editable ? `<div class="system-notice-actions"><button class="button button-secondary" data-system-notice-edit="${Number(item.id)}" type="button">編集</button><button class="button button-ghost" data-system-notice-delete="${Number(item.id)}" type="button">削除</button></div>` : ""}</article>`;
  }).join("")}</div>`;
}

function systemAdminFrame(activeView: SystemAdminView, content, noticeCount = 0) {
  const nav = SYSTEM_ADMIN_NAV.map((item) => `<a class="team-admin-nav-link ${activeView === item.view ? "is-active" : ""}" href="${systemAdminHref(item.view as SystemAdminView)}" ${activeView === item.view ? 'aria-current="page"' : ""}><span class="team-admin-nav-icon" aria-hidden="true">${adminNavIcon(item.icon)}</span><span>${item.label}</span>${item.view === "notices" && noticeCount ? `<span class="team-admin-nav-badge">${noticeCount}</span>` : ""}</a>`).join("");
  const mobileNav = SYSTEM_ADMIN_NAV.map((item) => `<a class="team-admin-mobile-menu-link ${activeView === item.view ? "is-active" : ""}" href="${systemAdminHref(item.view as SystemAdminView)}" ${activeView === item.view ? 'aria-current="page"' : ""}><span class="team-admin-nav-icon" aria-hidden="true">${adminNavIcon(item.icon)}</span><span>${item.label}</span>${item.view === "notices" && noticeCount ? `<span class="team-admin-nav-badge">${noticeCount}</span>` : ""}<span class="team-admin-mobile-menu-arrow" aria-hidden="true">›</span></a>`).join("");
  return `<div class="team-admin-frame system-admin-frame system-console">
    <aside class="team-admin-sidebar system-console-sidebar" aria-label="システム管理メニュー">
      <div class="team-admin-sidebar-team"><span>システム管理</span><strong>SIGN TRAINER</strong></div>
      <nav class="team-admin-nav">${nav}</nav>
      <div class="team-admin-sidebar-footer"><a href="/">トップページ</a></div>
    </aside>
    <div class="team-admin-workspace system-console-workspace">
      <section class="team-admin-mobile-menu-screen system-console-menu" id="system-admin-mobile-menu-screen" aria-label="システム管理メニュー" role="dialog" aria-modal="true" hidden>
        <header class="team-admin-mobile-menu-head"><div><span>システム管理</span><strong>SIGN TRAINER</strong></div><button class="team-admin-mobile-menu-close" type="button" data-system-admin-menu-close aria-label="メニューを閉じる">×</button></header>
        <nav class="team-admin-mobile-menu-list">${mobileNav}</nav>
        <div class="team-admin-mobile-menu-footer"><a href="/">トップページ</a><button class="team-admin-mobile-menu-footer-button" id="system-menu-logout" type="button">ログアウト</button></div>
      </section>
      ${content}
    </div>
  </div>`;
}

function systemDashboardContent(teams, notices) {
  const active = teams.filter((team) => team.status === "active").length;
  const deleted = teams.filter((team) => team.status === "deleted").length;
  const suspended = teams.filter((team) => team.status === "suspended").length;
  const totalSigns = teams.reduce((sum, team) => sum + Number(team.sign_count || 0), 0);
  const cards = [
    { view: "teams", icon: "teams", label: "チーム管理", value: `${teams.length}チーム`, hint: `利用中 ${active} / 停止 ${suspended} / 退会 ${deleted}` },
    { view: "security", icon: "security", label: "データ保護", value: "保護状態を確認", hint: "暗号化・検索キー移行" },
    { view: "notices", icon: "notices", label: "システムのお知らせ", value: `${notices.length}件`, hint: "更新・運用上の確認事項" }
  ];
  return `<div class="team-admin-view team-admin-dashboard-view">
    <section class="team-admin-dashboard-head"><div><p class="system-console-kicker">SYSTEM CONSOLE</p><h1>システム管理</h1><p>サービス全体の運用状況を確認し、チーム・データ保護・お知らせを管理します。</p></div></section>
    <section class="team-admin-summary-strip" aria-label="システムのサマリー"><div><strong>${teams.length}</strong><span>登録チーム</span></div><div><strong>${active}</strong><span>利用中</span></div><div><strong>${totalSigns}</strong><span>登録サイン</span></div></section>
    <section class="team-admin-launch-grid system-admin-launch-grid">${cards.map((card) => `<a class="team-admin-launch-card" href="${systemAdminHref(card.view as SystemAdminView)}"><span class="team-admin-launch-icon" aria-hidden="true">${adminNavIcon(card.icon)}</span><span class="team-admin-launch-copy"><small>${card.label}</small><strong>${esc(card.value)}</strong><em>${esc(card.hint)}</em></span><span class="team-admin-launch-arrow" aria-hidden="true">›</span></a>`).join("")}</section>
    <section class="admin-card team-admin-dashboard-notices"><div class="admin-section-heading"><div><h2>システムのお知らせ</h2></div><a class="team-admin-text-link" href="${systemAdminHref("notices")}">すべて見る</a></div>${systemNoticeList(notices, { limit: 3 })}</section>
  </div>`;
}

function systemTeamsContent(teams, plans = []) {
  const active = teams.filter((team) => team.status === "active").length;
  const suspended = teams.filter((team) => team.status === "suspended").length;
  const deleted = teams.filter((team) => team.status === "deleted").length;
  const planOptions = (plans.length ? plans : teams.map((team) => team.plan || { code: "free", name: "Free" })).reduce((items, plan) => {
    const code = String(plan?.code || "free");
    if (!items.some((item) => item.code === code)) items.push({ code, name: String(plan?.name || (code === "free" ? "Free" : code)) });
    return items;
  }, [] as Array<{ code: string; name: string }>);
  return `<div class="team-admin-view"><header class="team-admin-page-head"><div><h1>チーム管理</h1><p>チーム名・プラン・利用状態で絞り込みながら、登録・設定・利用状態を管理できます。退会済みチームもデータを保持したまま復活できます。</p></div><button class="button button-primary" id="create-team-open" type="button">＋ チームを登録</button></header>
    <section class="admin-card admin-card--flush-mobile"><div class="team-admin-page-summary"><strong>${teams.length}</strong><span>登録チーム</span><span class="system-admin-summary-note">利用中 ${active} / 停止中 ${suspended} / 退会済み ${deleted}</span></div>
      ${teams.length ? `<div class="system-team-filter system-team-filter--advanced"><label class="system-team-search" for="system-team-search"><span>チームを検索</span><input class="text-input" id="system-team-search" type="search" placeholder="チーム名・IDで検索"></label><label for="system-team-plan-filter"><span>プラン</span><select class="text-input" id="system-team-plan-filter"><option value="all">すべてのプラン</option>${planOptions.map((plan) => `<option value="${esc(plan.code)}">${esc(plan.name)}</option>`).join("")}</select></label><label for="system-team-status-filter"><span>利用状態</span><select class="text-input" id="system-team-status-filter"><option value="all">すべて（${teams.length}）</option><option value="active">利用中（${active}）</option><option value="suspended">利用停止（${suspended}）</option><option value="deleted">退会済み（${deleted}）</option></select></label></div>${pagedCollection(`<div class="admin-team-list">${teams.map(systemTeamCard).join("")}</div>`, teams.length, { pageSize: 10, label: "登録チーム" })}` : `<div class="admin-empty"><strong>まだチームがありません</strong><p>「チームを登録」から作成してください。</p></div>`}
    </section>
  </div>`;
}

function systemSecurityContent() {
  return `<div class="team-admin-view"><header class="team-admin-page-head"><div><h1>データ保護</h1><p>保存済みデータの暗号化・検索キー移行の状態を確認します。</p></div></header>
    <section class="admin-card"><div class="admin-section-heading admin-section-heading--actions"><div><h2>既存データの保護</h2><p class="admin-section-caption">既存のチーム名・個人情報・サイン名・グループ説明・動画情報をAES-256-GCMで暗号化し、OAuth識別子をHMAC検索キーへ移行します。</p></div><button class="button button-secondary" id="protect-data-now" type="button">既存データを保護</button></div><div id="data-protection-status" class="admin-help">状態を確認しています…</div></section>
  </div>`;
}

function systemNoticesContent(notices) {
  const published = notices.filter((item) => systemNoticeState(item).className === "published").length;
  return `<div class="team-admin-view"><header class="team-admin-page-head"><div><p class="system-console-kicker">COMMUNICATION</p><h1>システムのお知らせ</h1><p>利用者へ案内する更新情報・メンテナンス・重要なお知らせを管理します。</p></div><button class="button button-primary system-console-primary" id="create-system-notice" type="button">＋ お知らせを登録</button></header><section class="system-console-stats"><div><span>全件</span><strong>${notices.length}</strong></div><div><span>公開中</span><strong>${published}</strong></div><div><span>下書き・予約等</span><strong>${notices.length - published}</strong></div></section><section class="admin-card system-console-card">${pagedCollection(systemNoticeList(notices, { editable: true }), notices.length, { pageSize: 10, label: "システムのお知らせ" })}</section></div>`;
}

export async function renderSystemAdmin({ initialView = "" } = {}) {
  shell("システム管理", `<section class="admin-card admin-loading"><div class="spinner"></div><h1>システム管理を確認しています…</h1></section>`);
  const { response, data } = await requestJson("/api/system/session");
  if (!response.ok || !data.authenticated) {
    renderSystemLogin({ error: response.status === 503 ? (data.message || "サーバーの認証設定を確認してください。") : "", afterLogin: initialView || systemAdminViewFromPath() });
    return;
  }
  const openCreate = initialView === "create";
  const requestedView = openCreate ? "teams" : (initialView === "list" ? "dashboard" : initialView || systemAdminViewFromPath());
  const view: SystemAdminView = (SYSTEM_ADMIN_VIEWS as readonly string[]).includes(String(requestedView)) ? requestedView as SystemAdminView : systemAdminViewFromPath();
  renderSystemDashboard({ view, openCreate });
}

function renderSystemLogin({ error = "", afterLogin = "dashboard" } = {}) {
  shell("システム管理ログイン", `<section class="admin-card admin-auth-card">
    <div class="admin-lock">🔐</div>
    <h1>システム管理</h1>
    <p class="admin-lead">SIGN TRAINER全体の運用を管理します。</p>
    ${error ? notice(error, "error") : ""}
    <form id="system-login-form" class="admin-form">
      <label>システム管理者キー<input class="text-input" id="system-secret" type="password" autocomplete="current-password" required></label><p class="admin-help">12文字以上で、英字と数字を含む管理者キーを入力してください。</p>
      <button class="button button-primary button-full" type="submit">管理画面に入る</button>
    </form>
    <a class="button button-secondary button-full" href="/">トップページへ</a>
  </section>`);
  document.querySelector("#system-login-form")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const secret = (document.querySelector("#system-secret") as HTMLInputElement).value;
    const submit = (event.currentTarget as HTMLFormElement).querySelector<HTMLButtonElement>("button[type=submit]");
    if (submit) { submit.disabled = true; submit.textContent = "確認しています…"; }
    const { response, data } = await requestJson("/api/system/auth", { method: "POST", body: JSON.stringify({ secret }) });
    if (!response.ok) {
      renderSystemLogin({ error: data.message || "管理者キーを確認してください。", afterLogin });
      return;
    }
    const openCreate = afterLogin === "create";
    const view = openCreate ? "teams" : ((SYSTEM_ADMIN_VIEWS as readonly string[]).includes(afterLogin) ? afterLogin as SystemAdminView : systemAdminViewFromPath());
    renderSystemDashboard({ view, openCreate });
  });
}

async function renderSystemDashboard({ view = systemAdminViewFromPath(), message = "", openCreate = false } = {}) {
  closeSystemAdminMobileMenu();
  shell("システム管理", `<section class="admin-card admin-loading"><div class="spinner"></div><h1>管理画面を読み込んでいます…</h1></section>`);
  const { response, data } = await requestJson("/api/system/teams");
  if (response.status === 401) return renderSystemLogin({ afterLogin: openCreate ? "create" : view });
  if (!response.ok) {
    shell("システム管理", `<section class="admin-card"><h1>読み込めませんでした</h1>${notice(data.message || "D1の設定を確認してください。", "error")}<button class="button button-primary button-full" id="system-retry">再読み込み</button></section>`);
    document.querySelector("#system-retry")?.addEventListener("click", () => renderSystemDashboard({ view, openCreate }));
    return;
  }
  const teams = data.teams || [];
  const plans = data.plans || [];
  const noticeResult = await requestJson("/api/system/notices");
  if (noticeResult.response.status === 401) return renderSystemLogin({ afterLogin: openCreate ? "create" : view });
  const notices = noticeResult.response.ok ? (noticeResult.data.notices || []) : [];
  const normalizedView: SystemAdminView = (SYSTEM_ADMIN_VIEWS as readonly string[]).includes(String(view)) ? view as SystemAdminView : "dashboard";
  let viewContent = "";
  if (normalizedView === "teams") viewContent = systemTeamsContent(teams, plans);
  else if (normalizedView === "security") viewContent = systemSecurityContent();
  else if (normalizedView === "notices") viewContent = systemNoticesContent(notices);
  else viewContent = systemDashboardContent(teams, notices);
  const body = `${message ? notice(message, "success") : ""}${systemAdminFrame(normalizedView, viewContent, notices.length)}`;
  shell("システム管理", body, adminHeaderActions(adminHeaderMenuButton("system-admin-menu-open", "system-admin-mobile-menu-screen"), systemAdminHref("notices"), notices.length));
  wireSystemDashboard(teams, plans);
  wirePagedCollections();
  if (openCreate && normalizedView === "teams") requestAnimationFrame(() => (document.querySelector("#create-team-open") as HTMLButtonElement | null)?.click());
}

function systemTeamCard(team) {
  const isDeleted = team.status === "deleted";
  const statusLabel = isDeleted ? "退会済み" : team.status === "active" ? "利用中" : "利用停止";
  const plan = team.plan || { code: "free", name: "Free", isFree: true };
  const planCode = String(plan.code || "free");
  const dateLabel = isDeleted && team.deleted_at ? `退会 ${esc(formatDate(team.deleted_at))}` : `登録 ${esc(formatDate(team.created_at))}`;
  const actions = isDeleted
    ? `<button class="button button-primary" data-system-restore="${esc(team.id)}" type="button">チームを復活</button>`
    : `<a class="button button-primary" href="/t/${encodeURIComponent(team.id)}/admin"${relatedPageLinkAttrs()}>チーム管理画面を開く</a>
      <button class="button button-secondary" data-system-edit="${esc(team.id)}" type="button">設定を編集</button>
      <button class="button button-ghost" data-system-status="${esc(team.id)}" data-next-status="${team.status === "active" ? "suspended" : "active"}" type="button">${team.status === "active" ? "利用停止" : "利用再開"}</button>`;
  return `<article class="admin-team-card ${isDeleted ? "admin-team-card--deleted" : ""}" data-team-id="${esc(team.id)}" data-team-status="${esc(team.status)}" data-team-plan="${esc(planCode)}" data-team-search="${esc([team.name, team.id, plan.name, planCode].join(" ").toLocaleLowerCase("ja-JP"))}" data-page-item>
    <div class="admin-team-card-main">
      <div class="admin-team-title"><div class="admin-team-badges"><span class="admin-status admin-status--${esc(team.status)}">${statusLabel}</span><span class="admin-plan-mini">${esc(plan.name || "Free")}</span></div><h3>${esc(team.name)}</h3><p class="admin-id">${esc(team.id)}</p></div>
      <div class="admin-team-counts"><span><strong>${Number(team.sign_count || 0)}</strong><small>サイン</small></span><span><strong>${Number(team.video_count || 0)}</strong><small>動画</small></span></div>
    </div>
    <div class="admin-row-meta"><span>${dateLabel}</span>${isDeleted ? `<span>データ保持中</span>` : ""}</div>
    <div class="admin-card-actions">${actions}</div>
  </article>`;
}

async function refreshDataProtectionStatus() {
  const status = document.querySelector("#data-protection-status");
  if (!status) return;
  const { response, data } = await requestJson("/api/system/security/data-protection");
  if (!response.ok) { status.textContent = data.message || "データ保護状態を確認できませんでした。"; return; }
  if (data.complete) { status.textContent = "保護対象の既存データはすべて暗号化済みです。"; return; }
  const r = (data.remaining || {}) as Record<string, number>;
  const total = Object.values(r).reduce((sum, value) => sum + Number(value || 0), 0);
  status.textContent = `未保護データが ${total} 件あります。ボタンを押すと安全に段階移行します。`;
}

function wireSystemDashboard(teams, plans = []) {
  const logout = async () => {
    await fetch("/api/system/logout", { method: "POST" });
    closeSystemAdminMobileMenu();
    renderSystemLogin();
  };
  document.querySelector("#system-logout")?.addEventListener("click", logout);
  document.querySelector("#system-menu-logout")?.addEventListener("click", logout);
  document.querySelector("#system-admin-menu-open")?.addEventListener("click", () => document.querySelector("#system-admin-mobile-menu-screen")?.hasAttribute("hidden") ? openSystemAdminMobileMenu() : closeSystemAdminMobileMenu());
  document.querySelectorAll("[data-system-admin-menu-close]").forEach((button) => button.addEventListener("click", closeSystemAdminMobileMenu));
  document.querySelectorAll("#system-admin-mobile-menu-screen .team-admin-mobile-menu-link").forEach((link) => link.addEventListener("click", closeSystemAdminMobileMenu));

  refreshDataProtectionStatus();
  document.querySelector("#protect-data-now")?.addEventListener("click", async (event) => {
    const button = event.currentTarget as HTMLButtonElement;
    setButtonBusy(button, true, "保護しています…");
    const { response, data } = await requestJson("/api/system/security/data-protection", { method: "POST", body: JSON.stringify({ batchSize: 100, maxBatches: 20 }) });
    setButtonBusy(button, false);
    if (!response.ok) {
      const status = document.querySelector("#data-protection-status");
      if (status) status.textContent = data.message || "既存データを保護できませんでした。";
      return;
    }
    const status = document.querySelector("#data-protection-status");
    const protectedTotal = Object.entries(data.protected || {}).filter(([key]) => key !== "skippedIdentities").reduce((sum, [, value]) => sum + Number(value || 0), 0);
    if (status) status.textContent = data.complete ? `完了しました。${protectedTotal}件を保護しました。` : `${protectedTotal}件を保護しました。まだ未保護データがあります。もう一度実行してください。`;
  });

  const openNoticeEditor = (item = null) => {
    const toLocalInput = (value) => {
      if (!value) return "";
      const d = new Date(value.includes("T") ? value : `${value.replace(" ", "T")}Z`);
      if (Number.isNaN(d.getTime())) return "";
      const pad = (n) => String(n).padStart(2, "0");
      return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    };
    openAdminModal({
      title: item ? "お知らせを編集" : "お知らせを登録",
      kicker: "SYSTEM NOTICE",
      body: `<div id="admin-modal-error"></div><form id="system-notice-form" class="admin-form">
        <label>タイトル<input class="text-input" name="title" maxlength="120" value="${esc(item?.title || "")}" required></label>
        <label>本文<textarea class="text-input admin-textarea" name="body" maxlength="2000" rows="6" required>${esc(item?.body || "")}</textarea></label>
        <div class="admin-form-grid"><label>種別<select class="text-input" name="kind"><option value="info" ${item?.kind === "info" ? "selected" : ""}>お知らせ</option><option value="update" ${item?.kind === "update" ? "selected" : ""}>アップデート</option><option value="maintenance" ${item?.kind === "maintenance" ? "selected" : ""}>メンテナンス</option><option value="important" ${item?.kind === "important" ? "selected" : ""}>重要</option></select></label><label>状態<select class="text-input" name="status"><option value="published" ${!item || item?.status === "published" ? "selected" : ""}>公開</option><option value="draft" ${item?.status === "draft" ? "selected" : ""}>下書き</option></select></label></div>
        <div class="admin-form-grid"><label>掲載開始 <span class="admin-optional">任意</span><input class="text-input" name="publishAt" type="datetime-local" value="${esc(toLocalInput(item?.publish_at))}"></label><label>掲載終了 <span class="admin-optional">任意</span><input class="text-input" name="expiresAt" type="datetime-local" value="${esc(toLocalInput(item?.expires_at))}"></label></div>
        <p class="admin-help">新規登録は「公開」が初期値です。掲載開始を空欄にすると即時公開されます。「下書き」はチーム管理側のお知らせには表示されません。</p>
        <button class="button button-primary button-full system-console-primary" type="submit">${item ? "変更を保存" : "お知らせを登録"}</button>
      </form>`,
      onOpen(layer) {
        layer.querySelector("#system-notice-form")?.addEventListener("submit", async (event) => {
          event.preventDefault();
          const form = event.currentTarget as HTMLFormElement;
          const submit = form.querySelector<HTMLButtonElement>("button[type=submit]");
          const values = Object.fromEntries(new FormData(form).entries());
          const normalizeDate = (value) => value ? new Date(String(value)).toISOString() : "";
          const payload = { ...values, publishAt: normalizeDate(values.publishAt), expiresAt: normalizeDate(values.expiresAt) };
          if (payload.publishAt && payload.expiresAt && new Date(payload.expiresAt) <= new Date(payload.publishAt)) return modalError("掲載終了は掲載開始より後にしてください。");
          setButtonBusy(submit, true);
          const url = item ? `/api/system/notices/${encodeURIComponent(item.id)}` : "/api/system/notices";
          const { response, data } = await requestJson(url, { method: item ? "PUT" : "POST", body: JSON.stringify(payload) });
          if (!response.ok) { setButtonBusy(submit, false); return modalError(data.message || "保存できませんでした。"); }
          closeAdminModal(); renderSystemDashboard({ view: "notices", message: item ? "お知らせを更新しました。" : "お知らせを登録しました。" });
        });
      }
    });
  };
  document.querySelector("#create-system-notice")?.addEventListener("click", () => openNoticeEditor());
  document.querySelectorAll<HTMLElement>("[data-system-notice-edit]").forEach((button) => button.addEventListener("click", async () => {
    const { data } = await requestJson("/api/system/notices");
    const item = (data.notices || []).find((notice) => String(notice.id) === String(button.dataset.systemNoticeEdit));
    if (item) openNoticeEditor(item);
  }));
  document.querySelectorAll<HTMLElement>("[data-system-notice-delete]").forEach((button) => button.addEventListener("click", async () => {
    if (!confirm("このお知らせを削除しますか？")) return;
    const { response, data } = await requestJson(`/api/system/notices/${encodeURIComponent(button.dataset.systemNoticeDelete)}`, { method: "DELETE" });
    if (!response.ok) return alert(data.message || "削除できませんでした。");
    renderSystemDashboard({ view: "notices", message: "お知らせを削除しました。" });
  }));

  document.querySelector("#create-team-open")?.addEventListener("click", () => {
    openAdminModal({
      title: "新しいチームを登録",
      body: `<div id="admin-modal-error"></div><form id="create-team-form" class="admin-form">
        <label>チーム名<input class="text-input" name="name" type="text" maxlength="80" placeholder="例：熊本○○ジュニア" required></label>
        <label>選手用合言葉<input class="text-input" name="passphrase" type="text" maxlength="100" autocomplete="off" required></label>
        <label>チーム管理者パスワード<input class="text-input" name="adminPassword" type="password" minlength="12" maxlength="200" autocomplete="new-password" required></label>
        <p class="admin-help">管理者パスワードは12文字以上で、英字と数字をそれぞれ1文字以上含めてください。記号は必須ではありません。合言葉は参加URLとは別にメンバーへ伝えます。</p>
        <button class="button button-primary button-full" type="submit">チームを登録する</button>
      </form>`,
      onOpen(layer) {
        layer.querySelector("#create-team-form")?.addEventListener("submit", async (event) => {
          event.preventDefault();
          const form = event.currentTarget as HTMLFormElement;
          const submit = form.querySelector<HTMLButtonElement>("button[type=submit]");
          const payload = Object.fromEntries(new FormData(form).entries());
          if (!isValidAdminCredential(payload.adminPassword)) return modalError(adminCredentialMessage());
          setButtonBusy(submit, true, "登録しています…");
          const { response, data } = await requestJson("/api/system/teams", { method: "POST", body: JSON.stringify(payload) });
          if (!response.ok) { setButtonBusy(submit, false); return modalError(data.message || "登録できませんでした。"); }
          const playerUrl = teamUrl(data.team.id);
          const adminUrl = new URL(`/t/${encodeURIComponent(data.team.id)}/admin`, window.location.origin).href;
          const playerQr = await qrImageUrl(playerUrl, 280);
          const modalBody = layer.querySelector<HTMLElement>(".admin-modal-body");
          if (!modalBody) return;
          modalBody.innerHTML = `<div class="admin-created-team"><div class="admin-success-mark">✓</div><h3>登録しました</h3><p><strong>${esc(data.team.name)}</strong></p><div class="admin-qr-wrap"><div class="admin-qr"><img src="${esc(playerQr)}" alt="${esc(data.team.name)}の参加QRコード" width="220" height="220"><span class="admin-qr-logo"><img src="${ICON}" alt=""></span></div></div><label>選手用URL<div class="admin-copy-row"><input class="text-input" readonly value="${esc(playerUrl)}"><button class="button button-secondary" data-copy="${esc(playerUrl)}" type="button">コピー</button></div></label><label>管理URL<div class="admin-copy-row"><input class="text-input" readonly value="${esc(adminUrl)}"><button class="button button-secondary" data-copy="${esc(adminUrl)}" type="button">コピー</button></div></label><button class="button button-primary button-full" id="create-finish" type="button">完了</button></div>`;
          layer.querySelectorAll<HTMLElement>("[data-copy]").forEach((copyButton) => copyButton.addEventListener("click", () => copyText(copyButton.dataset.copy, copyButton)));
          layer.querySelector("#create-finish")?.addEventListener("click", () => { closeAdminModal(); renderSystemDashboard({ view: "teams", message: "チームを登録しました。" }); });
        });
      }
    });
  });

  document.querySelectorAll<HTMLElement>("[data-system-edit]").forEach((button) => button.addEventListener("click", () => {
    const team = teams.find((item) => String(item.id) === String(button.dataset.systemEdit));
    if (!team) return;
    openAdminModal({
      title: team.name,
      body: `<div id="admin-modal-error"></div><form id="system-team-edit-form" class="admin-form">
        <label>チーム名<input class="text-input" name="name" type="text" maxlength="80" value="${esc(team.name)}" required></label>
        <label>選手用合言葉を変更 <span class="admin-optional">変更時のみ</span><input class="text-input" name="passphrase" type="text" autocomplete="off"></label>
        <label>管理者パスワードを変更 <span class="admin-optional">変更時のみ・12文字以上＋英字＋数字</span><input class="text-input" name="adminPassword" type="password" minlength="12" autocomplete="new-password"></label>
        <label>チームプラン<select class="text-input" name="planCode">${(plans.length ? plans : [{code:"free",name:"Free"},{code:"team_plus",name:"Plus"},{code:"team_pro",name:"Pro"}]).map((plan) => `<option value="${esc(plan.code)}" ${String(team.plan?.code || "free") === String(plan.code) ? "selected" : ""}>${esc(plan.name)}${plan.code === "free" ? "" : "（限定提供）"}</option>`).join("")}</select></label>
        <div class="notice notice-info"><strong>Plus / Proは限定提供中です</strong><br><b>Plus</b>＝複数グループ・複数動画・サブ管理者などのチーム運用強化。<br><b>Pro</b>＝Plusの全機能＋成績分析・最近のアクティビティ／監査ログ。<br>一般のお申し込み・オンライン課金はできません。SYSTEM管理者が対象チームへ手動でプランを付与します。</div>
        <div class="admin-modal-actions"><button class="button button-primary" type="submit">保存する</button><button class="button button-danger" id="system-team-delete" type="button">退会済みにする</button></div>
      </form>`,
      onOpen(layer) {
        layer.querySelector("#system-team-edit-form")?.addEventListener("submit", async (event) => {
          event.preventDefault();
          const form = event.currentTarget as HTMLFormElement;
          const submit = form.querySelector<HTMLButtonElement>("button[type=submit]");
          const values = Object.fromEntries(new FormData(form).entries());
          if (values.adminPassword && !isValidAdminCredential(values.adminPassword)) return modalError(adminCredentialMessage());
          setButtonBusy(submit, true);
          const { response, data } = await requestJson(`/api/system/teams/${encodeURIComponent(team.id)}`, { method: "PUT", body: JSON.stringify(values) });
          if (!response.ok) { setButtonBusy(submit, false); return modalError(data.message || "保存できませんでした。"); }
          closeAdminModal(); renderSystemDashboard({ view: "teams", message: "チーム設定を保存しました。" });
        });
        layer.querySelector("#system-team-delete")?.addEventListener("click", async () => {
          if (!confirm(`「${team.name}」を退会済みにしますか？ 選手・管理画面は停止しますが、登録データは保持されます。`)) return;
          const { response, data } = await requestJson(`/api/system/teams/${encodeURIComponent(team.id)}`, { method: "DELETE" });
          if (!response.ok) return modalError(data.message || "退会状態へ変更できませんでした。");
          closeAdminModal(); renderSystemDashboard({ view: "teams", message: "チームを退会済みにしました。必要な場合は一覧から復活できます。" });
        });
      }
    });
  }));

  const systemTeamStatusFilter = document.querySelector<HTMLSelectElement>("#system-team-status-filter");
  const systemTeamPlanFilter = document.querySelector<HTMLSelectElement>("#system-team-plan-filter");
  const systemTeamSearch = document.querySelector<HTMLInputElement>("#system-team-search");
  const applySystemTeamFilters = () => {
    const status = systemTeamStatusFilter?.value || "all";
    const plan = systemTeamPlanFilter?.value || "all";
    const query = systemTeamSearch?.value.trim().toLocaleLowerCase("ja-JP") || "";
    const cards = [...document.querySelectorAll<HTMLElement>("[data-team-status][data-team-plan]")];
    cards.forEach((card) => {
      const statusMatched = status === "all" || card.dataset.teamStatus === status;
      const planMatched = plan === "all" || card.dataset.teamPlan === plan;
      const queryMatched = !query || String(card.dataset.teamSearch || "").includes(query);
      card.dataset.filteredOut = statusMatched && planMatched && queryMatched ? "false" : "true";
    });
    document.querySelector<HTMLElement>("[data-paged-collection]")?.dispatchEvent(new CustomEvent("admin:filter-change"));
  };
  systemTeamStatusFilter?.addEventListener("change", applySystemTeamFilters);
  systemTeamPlanFilter?.addEventListener("change", applySystemTeamFilters);
  systemTeamSearch?.addEventListener("input", applySystemTeamFilters);

  document.querySelectorAll<HTMLElement>("[data-system-restore]").forEach((button) => button.addEventListener("click", async () => {
    const teamId = button.dataset.systemRestore;
    const team = teams.find((item) => String(item.id) === String(teamId));
    if (!teamId || !confirm(`「${team?.name || teamId}」を復活しますか？ 退会前のサイン・グループ・管理者設定をそのまま再利用できます。`)) return;
    setButtonBusy(button, true, "復活しています…");
    const { response, data } = await requestJson(`/api/system/teams/${encodeURIComponent(teamId)}/restore`, { method: "POST" });
    if (!response.ok) { setButtonBusy(button, false); return alert(data.message || "復活できませんでした。"); }
    renderSystemDashboard({ view: "teams", message: "チームを復活しました。" });
  }));

  document.querySelectorAll<HTMLElement>("[data-system-status]").forEach((button) => button.addEventListener("click", async () => {
    const teamId = button.dataset.systemStatus;
    const status = button.dataset.nextStatus;
    if (!confirm(status === "suspended" ? "このチームを利用停止にしますか？" : "このチームの利用を再開しますか？")) return;
    const { response, data } = await requestJson(`/api/system/teams/${encodeURIComponent(teamId)}`, { method: "PUT", body: JSON.stringify({ status }) });
    if (!response.ok) return alert(data.message || "更新できませんでした。");
    renderSystemDashboard({ view: "teams", message: status === "active" ? "利用を再開しました。" : "利用を停止しました。" });
  }));
}

// ---------------- Team admin ----------------
export async function renderTeamAdmin(teamId) {
  shell("チーム管理", `<section class="admin-card admin-loading"><div class="spinner"></div><h1>チーム管理を確認しています…</h1></section>`);
  const { response, data } = await requestJson(`/api/team-admin/session?teamId=${encodeURIComponent(teamId)}`);
  if (response.status === 404) return renderTeamAdminNotFound();
  if (!response.ok || !data.authenticated) return renderTeamAdminLogin(teamId, {
    teamName: data.teamName || "",
    error: data.error === "sub_admin_plan_required" ? (data.message || "サブ管理者機能は現在利用できません。") : response.status === 503 ? (data.message || "サーバーの認証設定を確認してください。") : "",
    accountManaged: Boolean(data.accountManaged),
    legacyPasswordEnabled: data.legacyPasswordEnabled !== false
  });
  renderTeamDashboard(teamId);
}

function renderTeamAdminNotFound() {
  shell("チームが見つかりません", `<section class="admin-card admin-auth-card"><h1>チームが見つかりません</h1><p>管理URLを確認してください。</p><a class="button button-primary button-full" href="/">トップページへ</a></section>`);
}

function normalizePublishedSystemNotices(items) {
  if (!Array.isArray(items)) return [];
  const kindPriority = { important: 0, maintenance: 1 };
  return items.map((item) => ({
    id: `system-${item.id}`,
    kind: item.kind || "info",
    date: formatDate(item.publish_at || item.created_at),
    title: item.title || "お知らせ",
    body: item.body || "",
    source: "system"
  })).sort((a, b) => (kindPriority[a.kind] ?? 2) - (kindPriority[b.kind] ?? 2));
}

async function fetchPublishedSystemNotices() {
  try {
    const { response, data } = await requestJson("/api/public/notices");
    if (!response.ok) return [];
    return normalizePublishedSystemNotices(data.notices);
  } catch {
    return [];
  }
}

async function loadTeamAdminLoginNotices() {
  const section = document.querySelector<HTMLElement>("#team-admin-login-notices");
  const list = document.querySelector<HTMLElement>("#team-admin-login-notice-list");
  if (!section || !list) return;
  const notices = await fetchPublishedSystemNotices();
  if (!notices.length) return;
  list.innerHTML = `<div class="team-admin-login-notice-summary"><strong>${notices.length}</strong><span>件のお知らせ</span></div>${pagedCollection(teamNoticeList(notices), notices.length, { pageSize: 5, label: "ログイン画面のお知らせ" })}`;
  section.hidden = false;
  wirePagedCollections(section);
}

function renderTeamAdminLogin(teamId, { teamName = "", error = "", accountManaged = false, legacyPasswordEnabled = true } = {}) {
  const returnTo = teamAdminCurrentPath(teamId);
  const oauth = accountManaged ? `<div class="admin-account-login"><h2>管理者アカウントでログイン</h2><p class="admin-help">登録済みのGoogle / LINEアカウントを使います。</p>${adminOAuthButtons({ intent: "login", returnTo })}<p class="admin-help">続けることで、<a href="/terms" target="_blank" rel="noopener">利用規約</a>と<a href="/privacy" target="_blank" rel="noopener">プライバシーポリシー</a>を確認し同意したものとして扱います。</p></div>` : "";
  const passwordForm = legacyPasswordEnabled ? `<form id="team-admin-login-form" class="admin-form">
      <label>管理者パスワード<input class="text-input" id="team-admin-password" type="password" autocomplete="current-password" required></label>
      <p class="admin-help">${accountManaged ? "以前の共有パスワードでもログインできます。安全性のため、アカウント移行後は無効化を推奨します。" : "ログイン後にGoogle / LINEアカウントへ移行できます。"}</p>
      <button class="button button-primary button-full" type="submit">管理者パスワードで入る</button>
    </form>` : "";
  const teamLabel = teamName || "このチーム";
  shell("チーム管理ログイン", `<div class="team-admin-login-layout"><section class="admin-card admin-auth-card team-admin-login-card">
    <header class="team-admin-login-heading"><p class="team-admin-login-team-label">TEAM</p><p class="team-admin-login-team-name">${esc(teamLabel)}</p><h1>管理者のみなさん、こんにちは</h1><p class="admin-lead">サインや動画、チーム設定を管理するための管理画面です。</p></header>
    ${error ? notice(error, "error") : ""}
    ${oauth}${accountManaged && legacyPasswordEnabled ? `<div class="admin-auth-divider"><span>または</span></div>` : ""}${passwordForm}
    ${!accountManaged && !legacyPasswordEnabled ? notice("このチームの管理者アカウント設定を確認してください。", "error") : ""}
    <a class="button button-secondary button-full" href="/t/${encodeURIComponent(teamId)}"${relatedPageLinkAttrs()}>選手用ページを開く</a>
  </section><section class="admin-card team-admin-login-notices" id="team-admin-login-notices" hidden><div class="admin-section-heading"><div><p class="team-admin-login-notice-kicker">INFORMATION</p><h2>システムからのお知らせ</h2></div></div><div id="team-admin-login-notice-list"></div></section></div>`);
  loadTeamAdminLoginNotices();
  wireOAuthAvailability();
  document.querySelector("#team-admin-login-form")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const password = document.querySelector("#team-admin-password").value;
    const submit = event.currentTarget.querySelector("button[type=submit]");
    submit.disabled = true;
    submit.textContent = "確認しています…";
    const { response, data } = await requestJson("/api/team-admin/auth", { method: "POST", body: JSON.stringify({ teamId, password }) });
    if (!response.ok) return renderTeamAdminLogin(teamId, { teamName, accountManaged, legacyPasswordEnabled, error: data.message || "管理者パスワードを確認してください。" });
    renderTeamDashboard(teamId);
  });
}

function adminIdentitySection(teamId, team, auth, management) {
  if (auth?.type === "legacy-password") {
    return `<section class="admin-card admin-identity-card">
      <div class="admin-migration-callout"><div><h2>管理者アカウントへ移行</h2><p>現在は共有パスワードで管理しています。Google / LINEを連携すると、管理者の追加・交代・退会をアカウント単位で安全に行えます。移行完了時に旧共有パスワードは自動で無効化され、既存のサインや動画はそのままです。</p></div>${adminOAuthButtons({ intent: "claim-team", teamId, returnTo: teamAdminCurrentPath(teamId) })}<p class="admin-help">移行を続けることで、<a href="/terms" target="_blank" rel="noopener">利用規約</a>と<a href="/privacy" target="_blank" rel="noopener">プライバシーポリシー</a>を確認し同意したものとして扱います。</p></div>
    </section>`;
  }
  if (auth?.type !== "account" || !management) return "";
  const owner = management.currentRole === "owner";
  const members = management.members || [];
  const admins = members.filter((member) => member.role === "admin");
  const maxSubAdmins = Number(management.maxSubAdmins || 5);
  const pendingSubAdminInvites = Number(management.pendingSubAdminInvites || 0);
  const subAdminSlotsRemaining = Number.isFinite(Number(management.subAdminSlotsRemaining)) ? Number(management.subAdminSlotsRemaining) : Math.max(0, maxSubAdmins - admins.length - pendingSubAdminInvites);
  const canInviteSubAdmin = management.canInviteSubAdmin !== false && subAdminSlotsRemaining > 0;
  const memberRows = members.map((member) => `<div class="admin-identity-row">
    <div class="admin-identity-person"><span class="admin-identity-avatar">${esc((member.displayName || "管").slice(0,1))}</span><div><strong>${esc(member.displayName || "管理者")}</strong><small>${esc(member.email || "メールアドレス未取得")}</small></div></div>
    <div class="admin-card-actions"><span class="${member.role === "owner" ? "admin-owner-badge" : "admin-admin-badge"}">${member.role === "owner" ? "メイン管理者" : "サブ管理者"}</span>${owner && member.role === "admin" ? `<button class="button button-ghost" data-remove-admin="${esc(member.userId)}" type="button">サブ管理者から外す</button>` : ""}</div>
  </div>`).join("");
  const pending = (management.pendingInvites || []).map((invite) => `<div class="admin-identity-row"><div><strong>${invite.kind === "transfer" ? "メイン管理者交代" : "サブ管理者招待"}</strong><small>有効期限 ${esc(formatDate(new Date(Number(invite.expires_at) * 1000).toISOString()))}</small></div><button class="button button-ghost" data-revoke-invite="${esc(invite.id)}" type="button">取り消す</button></div>`).join("");
  return `<section class="admin-card admin-identity-card">
    <div class="admin-identity-header"><div><h2>管理者と権限</h2><p class="admin-section-caption">メイン管理者は1名、サブ管理者は最大${maxSubAdmins}名。管理者ごとにGoogle / LINEで本人認証します。</p></div><a class="button button-secondary" href="/account">マイアカウント</a></div>
    <div class="admin-admin-capacity"><strong>サブ管理者 ${admins.length} / ${maxSubAdmins}</strong><span>${pendingSubAdminInvites ? `承認待ち ${pendingSubAdminInvites}名 · ` : ""}追加可能 ${subAdminSlotsRemaining}名</span></div>
    <div class="admin-identity-list">${memberRows}</div>
    ${pending ? `<div class="admin-section-subtitle"><strong>承認待ちの招待</strong></div><div class="admin-identity-list">${pending}</div>` : ""}
    <div class="admin-identity-actions">${owner ? `<button class="button button-secondary" id="open-owner-transfer" type="button">メイン管理者を交代</button>${management.legacyPasswordEnabled ? `<button class="button button-ghost" id="disable-legacy-password" type="button">旧パスワードを無効化</button>` : `<span class="admin-status admin-status--active">共有パスワード無効</span>`}` : `<button class="button button-danger" id="leave-team-admin" type="button">このチームのサブ管理者を退会</button>`}</div>
    ${owner && !canInviteSubAdmin ? `<p class="admin-help">サブ管理者は最大${maxSubAdmins}名です。承認待ちの招待を取り消すか、既存のサブ管理者を外すと新しく招待できます。</p>` : ""}
    ${owner && management.legacyPasswordEnabled ? `<p class="admin-help">アカウント移行が確認できたら旧管理者パスワードを無効化すると、共有パスワードを知る人からのアクセスを止められます。</p>` : ""}
  </section>`;
}

function showInviteResult(teamId, invite, label) {
  openAdminModal({
    title: label,
    body: `<div class="admin-invite-result"><strong>このリンクを交代・追加する管理者本人へ送ってください</strong><div class="admin-copy-row"><input class="text-input" id="generated-invite-url" readonly value="${esc(invite.url)}"><button class="button button-primary" id="copy-generated-invite" type="button">コピー</button></div><p class="admin-help" id="invite-copy-status" aria-live="polite"></p><button class="button line-share-button button-full" id="line-generated-invite" type="button">LINEで送る</button><p class="admin-security-note">このリンクは一度だけ使用でき、最長72時間で期限切れになります。SNSなど公開場所には貼らないでください。</p></div><button class="button button-secondary button-full" id="invite-result-close" type="button">閉じる</button>`,
    onOpen(layer) {
      layer.querySelector("#copy-generated-invite")?.addEventListener("click", () => copyText(invite.url, layer.querySelector("#invite-copy-status")));
      layer.querySelector("#line-generated-invite")?.addEventListener("click", () => window.open(`https://line.me/R/share?text=${encodeURIComponent(`【SIGN TRAINER】\n${label}の招待です。\n${invite.url}`)}`, "_blank", "noopener,noreferrer"));
      layer.querySelector("#invite-result-close")?.addEventListener("click", () => { closeAdminModal(); renderTeamDashboard(teamId, { message: "招待リンクを発行しました。" }); });
    }
  });
}

function openAdminInviteModal(teamId) {
  openAdminModal({
    title: "サブ管理者を招待",
    body: `<div id="admin-modal-error"></div><p class="admin-modal-lead">招待する人だけにワンタイムリンクを送ります。相手はGoogle / LINEで本人認証してサブ管理者になります。</p><form id="admin-invite-form" class="admin-form"><label>リンクの有効時間<select class="text-input" name="expiresHours"><option value="24">24時間</option><option value="48">48時間</option><option value="72">72時間</option></select></label><button class="button button-primary button-full" type="submit">招待リンクを発行</button></form>`,
    onOpen(layer) {
      layer.querySelector("#admin-invite-form")?.addEventListener("submit", async (event) => {
        event.preventDefault(); const fd = new FormData(event.currentTarget as HTMLFormElement); const submit = event.currentTarget.querySelector("button[type=submit]"); setButtonBusy(submit, true, "発行しています…");
        const { response, data } = await requestJson("/api/team-admin/admins/invites", { method: "POST", body: JSON.stringify({ teamId, kind: "admin", expiresHours: Number(fd.get("expiresHours")) }) });
        if (!response.ok) { setButtonBusy(submit, false); return modalError(data.message || "招待リンクを発行できませんでした。"); }
        closeAdminModal(); showInviteResult(teamId, data.invite, "サブ管理者追加");
      });
    }
  });
}

function openOwnerTransferModal(teamId, management) {
  const admins = (management.members || []).filter((member) => member.role === "admin");
  openAdminModal({
    title: "メイン管理者を交代",
    body: `<div id="admin-modal-error"></div><div class="notice notice-warning"><strong>重要な操作です</strong><br>交代が完了すると旧共有パスワードは自動的に無効化されます。</div><form id="owner-transfer-form" class="admin-form">${admins.length ? `<label>交代方法<select class="text-input" name="nextOwnerUserId"><option value="">新しい人へ交代リンクを発行</option>${admins.map((member) => `<option value="${esc(member.userId)}">登録済みサブ管理者：${esc(member.displayName)}</option>`).join("")}</select></label>` : `<p class="admin-help">登録済みのサブ管理者がいないため、新しいメイン管理者へ交代リンクを発行します。</p>`}<label class="admin-toggle admin-toggle--panel"><input type="checkbox" name="currentOwnerExit"><span>交代後、自分はこのチームの管理者から外れる</span></label><label>リンクの有効時間 <span class="admin-optional">新しい人へ発行する場合</span><select class="text-input" name="expiresHours"><option value="24">24時間</option><option value="48">48時間</option><option value="72">72時間</option></select></label><button class="button button-primary button-full" type="submit">交代手続きを進める</button></form>`,
    onOpen(layer) {
      layer.querySelector("#owner-transfer-form")?.addEventListener("submit", async (event) => {
        event.preventDefault(); const fd = new FormData(event.currentTarget as HTMLFormElement); const submit = event.currentTarget.querySelector("button[type=submit]"); const nextOwnerUserId = String(fd.get("nextOwnerUserId") || ""); const currentOwnerExit = fd.get("currentOwnerExit") === "on"; setButtonBusy(submit, true, "処理しています…");
        if (nextOwnerUserId) {
          if (!confirm("選択したサブ管理者へメイン管理者権限を移します。続けますか？")) { setButtonBusy(submit, false); return; }
          const { response, data } = await requestJson("/api/team-admin/admins/transfer", { method: "POST", body: JSON.stringify({ teamId, nextOwnerUserId, currentOwnerExit }) });
          if (!response.ok) { setButtonBusy(submit, false); if (handleFreshAuthResponse(response, data, teamAdminCurrentPath(teamId))) return; return modalError(data.message || "交代できませんでした。"); }
          closeAdminModal(); return renderTeamDashboard(teamId, { message: "メイン管理者を交代しました。" });
        }
        const { response, data } = await requestJson("/api/team-admin/admins/invites", { method: "POST", body: JSON.stringify({ teamId, kind: "transfer", currentOwnerExit, expiresHours: Number(fd.get("expiresHours")) }) });
        if (!response.ok) { setButtonBusy(submit, false); if (handleFreshAuthResponse(response, data, teamAdminCurrentPath(teamId))) return; return modalError(data.message || "交代リンクを発行できませんでした。"); }
        closeAdminModal(); showInviteResult(teamId, data.invite, "メイン管理者交代");
      });
    }
  });
}

function closeTeamAdminMobileMenu() {
  const menu = document.querySelector<HTMLElement>("#team-admin-mobile-menu-screen");
  const openButton = document.querySelector<HTMLButtonElement>("#team-admin-menu-open");
  if (teamAdminMenuKeyHandler) document.removeEventListener("keydown", teamAdminMenuKeyHandler);
  teamAdminMenuKeyHandler = null;
  menu?.setAttribute("hidden", "");
  openButton?.setAttribute("aria-expanded", "false");
  document.body.classList.remove("team-admin-menu-open");
  const restore = teamAdminMenuRestoreFocus as HTMLElement | null;
  teamAdminMenuRestoreFocus = null;
  if (restore?.isConnected && typeof restore.focus === "function") restore.focus({ preventScroll: true });
}

function openTeamAdminMobileMenu() {
  const menu = document.querySelector<HTMLElement>("#team-admin-mobile-menu-screen");
  const openButton = document.querySelector<HTMLButtonElement>("#team-admin-menu-open");
  if (!menu || !openButton) return;
  teamAdminMenuRestoreFocus = document.activeElement;
  menu.removeAttribute("hidden");
  openButton.setAttribute("aria-expanded", "true");
  document.body.classList.add("team-admin-menu-open");
  teamAdminMenuKeyHandler = (event: KeyboardEvent) => {
    if (event.key === "Escape") {
      event.preventDefault();
      closeTeamAdminMobileMenu();
      return;
    }
    if (event.key !== "Tab") return;
    const focusable = [...menu.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])')]
      .filter((element) => !element.hidden && element.getClientRects().length);
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  };
  document.addEventListener("keydown", teamAdminMenuKeyHandler);
  menu.querySelector<HTMLElement>("[data-team-admin-menu-close]")?.focus({ preventScroll: true });
}

const TEAM_ADMIN_VIEWS = ["dashboard", "activity", "groups", "signs", "share", "admins", "plan-auth", "notices", "settings"] as const;
type TeamAdminView = typeof TEAM_ADMIN_VIEWS[number];

const TEAM_ADMIN_NAV = [
  { view: "dashboard", label: "ダッシュボード", icon: "dashboard" },
  { view: "notices", label: "システムのお知らせ", icon: "notices" },
  { view: "groups", label: "サイングループ", icon: "groups" },
  { view: "signs", label: "サイン管理", icon: "signs" },
  { view: "share", label: "共有", icon: "share" },
  { view: "admins", label: "管理者", icon: "admins" },
  { view: "plan-auth", label: "プラン・認証", icon: "plan" },
  { view: "settings", label: "チーム設定", icon: "settings" },
  { view: "activity", label: "最近のアクティビティ", icon: "activity" }
] as const;

function teamAdminViewFromPath(pathname = location.pathname): TeamAdminView {
  const match = pathname.replace(/\/$/, "").match(/\/admin(?:\/(activity|groups|signs|share|admins|plan-auth|notices|settings))?$/);
  const view = match?.[1] || "dashboard";
  return (TEAM_ADMIN_VIEWS as readonly string[]).includes(view) ? view as TeamAdminView : "dashboard";
}

function teamAdminHref(teamId, view: TeamAdminView = "dashboard") {
  const base = `/t/${encodeURIComponent(teamId)}/admin`;
  return view === "dashboard" ? base : `${base}/${view}`;
}

function teamAdminCurrentPath(teamId) {
  return teamAdminHref(teamId, teamAdminViewFromPath());
}

function teamSystemNotices({ team, auth, adminManagement, plan, groups, signs }) {
  const notices = [];
  if (auth?.type === "legacy-password") {
    notices.unshift({ id: "legacy-auth", kind: "security", source: "fixed", date: "要確認", title: "管理者アカウントへの移行をおすすめします", body: "現在は共有の管理者パスワードでログインしています。Google / LINE連携後は管理者ごとに本人認証できます。" });
  } else if (adminManagement?.legacyPasswordEnabled) {
    notices.unshift({ id: "legacy-password-enabled", kind: "security", source: "fixed", date: "要確認", title: "旧管理者パスワードがまだ有効です", body: "Google / LINEで管理できることを確認後、管理者画面から旧共有パスワードを無効化できます。" });
  }
  if (!groups.length) notices.push({ id: "no-groups", kind: "setup", source: "fixed", date: "セットアップ", title: "サイングループがまだありません", body: "サイングループ画面から、バッティングサイン・守備サイン（ランナーなし）・守備サイン（2塁ランナーあり）・ピッチングサイン・走塁サインなど、用途や状況ごとの単位を作成できます。" });
  if (!signs.length) notices.push({ id: "no-signs", kind: "setup", source: "fixed", date: "セットアップ", title: "サインがまだ登録されていません", body: "サイン管理画面から最初のサインとYouTube動画を登録できます。" });
  if (plan?.isFree) notices.push({ id: "free-plan", kind: "info", source: "fixed", date: "現在", title: `${plan.name || "Free"}プランを利用中です`, body: "基本的なサイン登録・YouTube動画・クイズ・共有・PWAと規定の1グループを利用できます。Plus / Proは現在、特定チーム限定で提供中です。" });
  return notices;
}

function teamNoticeKindLabel(item) {
  return ({ important: "重要", maintenance: "メンテナンス", update: "新機能", info: "お知らせ", security: "要確認", setup: "設定" })[item?.kind] || "お知らせ";
}

function teamNoticeList(notices, { limit = 0 } = {}) {
  const rows = limit > 0 ? notices.slice(0, limit) : notices;
  if (!rows.length) return `<div class="admin-empty"><strong>現在のお知らせはありません</strong><p>新しい案内がある場合はここに表示されます。</p></div>`;
  return `<div class="team-admin-notice-list">${rows.map((item) => `<article class="team-admin-notice-item team-admin-notice-item--${esc(item.kind)}" data-page-item><div class="team-admin-notice-meta"><strong class="team-admin-notice-kind team-admin-notice-kind--${esc(item.kind)}">${esc(teamNoticeKindLabel(item))}</strong><span>${esc(item.date)}</span>${item.source === "fixed" ? `<em>チーム設定</em>` : `<em>運営</em>`}</div><div><strong>${esc(item.title)}</strong><p>${esc(item.body)}</p></div></article>`).join("")}</div>`;
}

function auditActionLabel(item) {
  const labels = {
    "auth.success": "共有管理者パスワードでログイン",
    "team.update": "チーム設定を変更",
    "group.create": "サイングループを追加",
    "group.update": "サイングループを編集",
    "group.soft_delete": "サイングループを削除",
    "sign.create": "サインを追加",
    "sign.update": "サインを編集",
    "sign.soft_delete": "サインを削除",
    "video.create": "サイン動画を追加",
    "video.update": "サイン動画を編集",
    "video.soft_delete": "サイン動画を削除",
    "admin.invite.create": "サブ管理者の招待を作成",
    "admin.invite.revoke": "管理者招待を取り消し",
    "admin.invite.accept": "サブ管理者の招待を承認",
    "admin.remove": "サブ管理者を解除",
    "admin.leave": "チーム管理者から退会",
    "owner.transfer": "メイン管理者を交代",
    "owner.transfer.accept": "メイン管理者の交代を承認",
    "legacy_admin_password.disable": "旧管理者パスワードを無効化",
    "team.claim": "管理者アカウントへ移行",
    "team.withdraw": "チームを退会",
    "team.restore": "退会済みチームを復活",
    "plan.change": "チームプランを変更"
  };
  return labels[item?.action] || String(item?.action || "操作を実行");
}

function activityTargetLabel(item, signs = [], groups = []) {
  const id = String(item?.targetId || "");
  if (item?.targetType === "sign") return signs.find((sign) => String(sign.dbId) === id)?.name || (id ? `サイン #${id}` : "サイン");
  if (item?.targetType === "group") return groups.find((group) => String(group.id) === id)?.name || (id ? `グループ #${id}` : "グループ");
  if (item?.targetType === "video") return id ? `動画 #${id}` : "動画";
  if (item?.targetType === "team") return "チーム";
  if (item?.targetType === "user") return "管理者アカウント";
  return "";
}

function teamActivityList(activity, signs = [], groups = [], { limit = 0 } = {}) {
  const rows = limit > 0 ? activity.slice(0, limit) : activity;
  if (!rows.length) return `<div class="admin-empty"><strong>まだアクティビティはありません</strong><p>設定やサインを変更すると、ここに監査ログが表示されます。</p></div>`;
  return `<div class="team-activity-list">${rows.map((item) => `<article class="team-activity-item" data-page-item><div class="team-activity-icon" aria-hidden="true">${adminNavIcon("activity")}</div><div class="team-activity-main"><div class="team-activity-title"><strong>${esc(auditActionLabel(item))}</strong>${activityTargetLabel(item, signs, groups) ? `<span>${esc(activityTargetLabel(item, signs, groups))}</span>` : ""}</div><p><b>${esc(item.actorName || "管理者")}</b><span>${esc(formatDate(item.createdAt))}</span></p></div></article>`).join("")}</div>`;
}

async function fetchTeamActivity(teamId) {
  try {
    const { response, data } = await requestJson(`/api/team-admin/activity?teamId=${encodeURIComponent(teamId)}`);
    return response.ok && Array.isArray(data.activity) ? data.activity : [];
  } catch { return []; }
}

function teamAdminFrame(teamId, teamName, activeView: TeamAdminView, content, noticeCount = 0, entitlements = {}) {
  const activityPaid = featureEnabled(entitlements, "activity_log");
  const nav = TEAM_ADMIN_NAV.map((item) => {
    const premium = item.view === "activity" && !activityPaid;
    return `<a class="team-admin-nav-link ${activeView === item.view ? "is-active" : ""}" href="${teamAdminHref(teamId, item.view)}" ${activeView === item.view ? 'aria-current="page"' : ""}><span class="team-admin-nav-icon" aria-hidden="true">${adminNavIcon(item.icon)}</span><span>${item.label}</span>${item.view === "notices" && noticeCount ? `<span class="team-admin-nav-badge">${noticeCount}</span>` : premium ? `<span class="team-admin-nav-premium">Pro</span>` : ""}</a>`;
  }).join("");
  const mobileNav = TEAM_ADMIN_NAV.map((item) => {
    const premium = item.view === "activity" && !activityPaid;
    return `<a class="team-admin-mobile-menu-link ${activeView === item.view ? "is-active" : ""}" href="${teamAdminHref(teamId, item.view)}" ${activeView === item.view ? 'aria-current="page"' : ""}><span class="team-admin-nav-icon" aria-hidden="true">${adminNavIcon(item.icon)}</span><span>${item.label}</span>${item.view === "notices" && noticeCount ? `<span class="team-admin-nav-badge">${noticeCount}</span>` : premium ? `<span class="team-admin-nav-premium">Pro</span>` : ""}<span class="team-admin-mobile-menu-arrow" aria-hidden="true">›</span></a>`;
  }).join("");
  return `<div class="team-admin-frame">
    <aside class="team-admin-sidebar" aria-label="チーム管理メニュー">
      <div class="team-admin-sidebar-team"><span>チーム管理</span><strong>${esc(teamName)}</strong></div>
      <nav class="team-admin-nav">${nav}</nav>
      <div class="team-admin-sidebar-footer"><a href="/account">マイアカウント</a><a href="/t/${encodeURIComponent(teamId)}"${relatedPageLinkAttrs()}>選手用ページを開く</a></div>
    </aside>
    <div class="team-admin-workspace">
      <section class="team-admin-mobile-menu-screen" id="team-admin-mobile-menu-screen" aria-label="チーム管理メニュー" role="dialog" aria-modal="true" hidden>
        <header class="team-admin-mobile-menu-head"><div><span>チーム管理</span><strong>${esc(teamName)}</strong></div><button class="team-admin-mobile-menu-close" type="button" data-team-admin-menu-close aria-label="メニューを閉じる">×</button></header>
        <nav class="team-admin-mobile-menu-list">${mobileNav}</nav>
        <div class="team-admin-mobile-menu-footer"><a href="/account">マイアカウント</a><a href="/t/${encodeURIComponent(teamId)}"${relatedPageLinkAttrs()}>選手用ページを開く</a><button class="team-admin-mobile-menu-footer-button" id="team-menu-logout" type="button">ログアウト</button></div>
      </section>
      ${content}
    </div>
  </div>`;
}

function teamDashboardContent(teamId, team, groups, signs, totalVideos, plan, entitlements, notices, auth, adminManagement, activity = []) {
  const enabledSigns = signs.filter((sign) => sign.enabled).length;
  const fixedNotices = notices.filter((item) => item.source === "fixed");
  const publishedNotices = notices.filter((item) => item.source !== "fixed");
  const enabledGroups = groups.filter((group) => group.enabled).length;
  const adminMembers = adminManagement?.members || [];
  const subAdmins = adminMembers.filter((member) => member.role === "admin");
  const maxSubAdmins = Number(adminManagement?.maxSubAdmins || 5);
  const canUseActivity = featureEnabled(entitlements, "activity_log");
  const canUseSubAdmins = featureEnabled(entitlements, "sub_admin_management");
  const canUseMultipleGroups = featureEnabled(entitlements, "multiple_sign_groups");
  const adminCard = auth?.type === "account"
    ? { view: "admins", icon: "admins", label: "管理者", value: `${adminMembers.length}名`, hint: `サブ管理者 ${subAdmins.length}/${maxSubAdmins}` }
    : { view: "admins", icon: "admins", label: "管理者", value: "アカウント未移行", hint: "Google / LINE認証へ移行" };
  const cards = [
    { view: "groups", icon: "groups", label: "サイングループ", value: `${groups.length}グループ`, hint: canUseMultipleGroups ? (enabledGroups === groups.length ? "複数グループ利用可" : `使用中 ${enabledGroups}`) : "Freeは1グループまで" },
    { view: "signs", icon: "signs", label: "サイン管理", value: `${signs.length}サイン`, hint: `練習対象 ${enabledSigns}` },
    { view: "share", icon: "share", label: "共有", value: "参加リンク・QR", hint: "選手用ページを共有" },
    { ...adminCard, hint: canUseSubAdmins ? adminCard.hint : "Freeはメイン管理者1名" },
    { view: "plan-auth", icon: "plan", label: "プラン・認証", value: plan.name || "Free", hint: "契約・認証方式を確認" },
    { view: "settings", icon: "settings", label: "チーム設定", value: "基本設定", hint: "チーム名・合言葉" }
  ];
  return `<div class="team-admin-view team-admin-dashboard-view">
    <section class="team-admin-dashboard-head"><div><div class="team-admin-dashboard-titleline"><h1>${esc(team.name)}</h1><span class="team-admin-dashboard-greeting">管理者のみなさん、こんにちは！</span></div><p>必要な情報だけ確認して、詳しい操作は各メニューから行えます。</p></div><a class="button button-primary team-admin-player-button" href="/t/${encodeURIComponent(teamId)}"${relatedPageLinkAttrs()}>選手用ページを開く</a></section>
    <section class="team-admin-summary-strip" aria-label="チームのサマリー"><div><strong>${groups.length}</strong><span>グループ</span></div><div><strong>${signs.length}</strong><span>サイン</span></div><div><strong>${totalVideos}</strong><span>動画</span></div></section>
    <section class="team-admin-launch-grid">${cards.map((card) => `<a class="team-admin-launch-card" href="${teamAdminHref(teamId, card.view as TeamAdminView)}"><span class="team-admin-launch-icon" aria-hidden="true">${adminNavIcon(card.icon)}</span><span class="team-admin-launch-copy"><small>${card.label}</small><strong>${esc(card.value)}</strong><em>${esc(card.hint)}</em></span><span class="team-admin-launch-arrow" aria-hidden="true">›</span></a>`).join("")}</section>
    <section class="team-admin-dashboard-lower-grid" aria-label="お知らせと最近のアクティビティ">
      <section class="admin-card team-admin-dashboard-notices"><div class="admin-section-heading"><div><h2>システムのお知らせ</h2><p class="admin-section-caption">チーム固有の案内を先に、運営からのお知らせをその下に表示します。</p></div><a class="team-admin-text-link" href="${teamAdminHref(teamId, "notices")}">すべて見る</a></div>${fixedNotices.length ? `<div class="team-admin-notice-block"><div class="team-admin-notice-block-title"><strong>チーム設定・アカウント</strong><span>${fixedNotices.length}件</span></div>${teamNoticeList(fixedNotices)}</div>` : ""}${publishedNotices.length ? `<div class="team-admin-notice-block"><div class="team-admin-notice-block-title"><strong>運営からのお知らせ</strong><span>${publishedNotices.length}件</span></div>${teamNoticeList(publishedNotices, { limit: 3 })}</div>` : `<div class="admin-empty admin-empty--compact"><strong>運営からのお知らせはありません</strong></div>`}</section>
      <section class="admin-card team-admin-dashboard-activity"><div class="admin-section-heading"><div><h2>最近のアクティビティ ${canUseActivity ? "" : paidFeatureBadge("Pro")}</h2><p class="admin-section-caption">管理者による変更履歴を監査ログから表示します。</p></div><a class="team-admin-text-link" href="${teamAdminHref(teamId, "activity")}">${canUseActivity ? "すべて見る" : "詳細"}</a></div>${canUseActivity ? teamActivityList(activity, signs, groups, { limit: 5 }) : `<div class="paid-feature-compact"><strong>変更履歴の確認はPro機能です</strong><p>${esc(PAID_LIMITED_MESSAGE)}</p></div>`}</section>
    </section>
  </div>`;
}

function teamActivityContent(activity, signs, groups, entitlements = {}) {
  const enabled = featureEnabled(entitlements, "activity_log");
  if (!enabled) return `<div class="team-admin-view"><header class="team-admin-page-head"><div><h1>最近のアクティビティ ${paidFeatureBadge("Pro")}</h1><p>誰が・何を・いつ変更したかを監査ログから確認できる運用機能です。</p></div></header>${limitedFeaturePanel("最近のアクティビティ", "管理者による変更履歴を監査ログから確認できます。")}</div>`;
  return `<div class="team-admin-view"><header class="team-admin-page-head"><div><h1>最近のアクティビティ</h1><p>チーム管理で誰が・何を・いつ変更したかを監査ログから確認できます。</p></div></header><section class="admin-card admin-card--flush-mobile"><div class="team-admin-page-summary"><strong>${activity.length}</strong><span>監査ログ</span><span class="system-admin-summary-note">新しい順</span></div>${activity.length ? pagedCollection(teamActivityList(activity, signs, groups), activity.length, { pageSize: 15, label: "最近のアクティビティ" }) : teamActivityList([])}</section></div>`;
}

function teamGroupsContent(groups, signs, entitlements = {}) {
  const canAddGroup = groups.length < 1 || featureEnabled(entitlements, "multiple_sign_groups");
  const addButton = canAddGroup
    ? `<button class="button button-primary" id="open-add-group" type="button">＋ グループを追加</button>`
    : `<button class="button button-primary" data-premium-feature="複数サイングループ" data-premium-description="Freeプランではサイングループは1つまでです。Plus / Proでは用途・状況ごとに複数作成できます。既存のグループやサインはそのまま保持されます。" type="button">＋ グループを追加 ${paidFeatureBadge("Plus")}</button>`;
  return `<div class="team-admin-view"><header class="team-admin-page-head"><div><h1>サイングループ</h1><p>グループの作成・説明・説明動画・使用状態を管理します。</p></div>${addButton}</header>
    ${!canAddGroup ? `<div class="notice notice-info"><strong>Freeプランは1グループまで</strong><br>${esc(PAID_LIMITED_MESSAGE)}</div>` : ""}
    <section class="admin-card admin-card--flush-mobile"><div class="team-admin-page-summary"><strong>${groups.length}</strong><span>登録グループ</span></div>${groups.length ? `<div class="team-group-filter"><label class="team-sign-search-box" for="group-search"><span aria-hidden="true">⌕</span><input class="text-input" id="group-search" type="search" placeholder="グループ名で検索"></label></div>${pagedCollection(`<div class="admin-group-list">${groups.map((group) => teamGroupCard(group, signs)).join("")}</div>`, groups.length, { pageSize: 10, label: "サイングループ" })}` : `<div class="admin-empty"><strong>グループはまだありません</strong><p>最初のグループはFreeプランでも作成できます。例：バッティングサイン / 守備サイン（ランナーなし） / 守備サイン（2塁ランナーあり） / ピッチングサイン / 走塁サイン</p><button class="button button-primary" id="open-add-group-empty" type="button">＋ 最初のグループを追加</button></div>`}</section>
  </div>`;
}

function selectedSignGroupKey(groups, signs) {
  const requested = new URLSearchParams(location.search).get("groupId");
  if (!requested || requested === "all") return "all";
  if (requested === "ungrouped" && signs.some((sign) => !sign.groupId)) return requested;
  if (groups.some((group) => String(group.id) === requested)) return requested;
  return "all";
}

function teamSignsContent(signs, groups, entitlements = {}) {
  const selectedKey = selectedSignGroupKey(groups, signs);
  const selectedGroup = groups.find((group) => String(group.id) === selectedKey) || null;
  const ungroupedSigns = signs.filter((sign) => !sign.groupId);
  const visibleSigns = selectedKey === "all"
    ? signs
    : selectedKey === "ungrouped"
      ? ungroupedSigns
      : selectedGroup
        ? signs.filter((sign) => Number(sign.groupId) === Number(selectedGroup.id))
        : signs;
  const groupOptions = groups.map((group) => {
    const count = signs.filter((sign) => Number(sign.groupId) === Number(group.id)).length;
    return `<option value="${Number(group.id)}" ${String(group.id) === selectedKey ? "selected" : ""}>${esc(group.name)}（${count}）</option>`;
  }).join("");
  const ungroupedOption = ungroupedSigns.length
    ? `<option value="ungrouped" ${selectedKey === "ungrouped" ? "selected" : ""}>未分類・要整理（${ungroupedSigns.length}）</option>`
    : "";
  const defaultGroupAttr = selectedGroup ? ` data-default-group-id="${Number(selectedGroup.id)}"` : "";
  const addLabel = selectedGroup ? `＋ ${esc(selectedGroup.name)}にサインを追加` : "＋ サインを追加";
  const ungroupedWarning = selectedKey === "ungrouped"
    ? `<div class="team-sign-group-selection team-sign-group-selection--warning"><div><span>未分類のサイン</span><strong>グループ未設定</strong><p>各サインの「編集」から正しいグループへ移動してください。</p></div></div>`
    : "";
  const signList = visibleSigns.length
    ? pagedCollection(`<div class="admin-sign-list admin-sign-list--overview">${visibleSigns.map((sign, index) => teamSignCard(sign, index, groups, entitlements, { canMoveUp: index > 0, canMoveDown: index < visibleSigns.length - 1 })).join("")}</div>`, visibleSigns.length, { pageSize: 8, label: "サイン" })
    : `<div class="admin-empty"><strong>表示できるサインがありません</strong><p>「サインを追加」から最初のサインを登録してください。</p></div>`;
  const selector = groups.length || ungroupedSigns.length || signs.length
    ? `<div class="team-sign-group-picker"><label for="sign-group-filter">表示するグループ</label><div class="team-sign-filter-row"><select class="text-input" id="sign-group-filter"><option value="all" ${selectedKey === "all" ? "selected" : ""}>すべてのサイン（${signs.length}）</option>${groupOptions}${ungroupedOption}</select><label class="team-sign-search-box" for="sign-search"><span aria-hidden="true">⌕</span><input class="text-input" id="sign-search" type="search" placeholder="サイン名・動画メモで検索"></label><button class="button button-primary team-sign-add-button" id="open-add-sign"${defaultGroupAttr} type="button">${addLabel}</button></div><p>「すべてのサイン」を初期表示します。グループを選ぶと目的別に絞り込めます。登録・編集画面では所属グループを変更できます。</p></div>`
    : "";
  const canAddGroup = groups.length < 1 || featureEnabled(entitlements, "multiple_sign_groups");
  const addGroupButton = canAddGroup
    ? `<button class="button button-secondary" id="open-add-group" type="button">＋ グループ追加</button>`
    : `<button class="button button-secondary" data-premium-feature="複数サイングループ" data-premium-description="Freeプランではサイングループは1つまでです。Plus / Proでは複数作成できます。" type="button">＋ グループ追加 ${paidFeatureBadge("Plus")}</button>`;
  return `<div class="team-admin-view"><header class="team-admin-page-head"><div><h1>サイン管理</h1><p>グループで絞り込んだり、すべてのサインをまとめて確認・登録できます。</p></div><div class="team-admin-page-actions">${addGroupButton}</div></header>
    <section class="admin-card admin-card--flush-mobile">${groups.length || ungroupedSigns.length || signs.length ? `${selector}${ungroupedWarning}<div class="team-admin-page-summary team-admin-page-summary--signs team-admin-page-summary--sign-total"><strong class="team-sign-total-label">全<span id="sign-visible-count">${visibleSigns.length}</span>サイン</strong></div>${signList}` : `<div class="admin-empty"><strong>先にサイングループを作成してください</strong><p>最初のグループはFreeプランでも作成できます。</p><button class="button button-primary" id="open-add-group-empty" type="button">＋ 最初のグループを追加</button></div>`}</section>
  </div>`;
}

function teamShareContent(team, playerUrl, qrSrc) {
  return `<div class="team-admin-view"><header class="team-admin-page-head"><div><h1>選手用ページを共有</h1><p>参加リンクとQRコードだけをまとめています。合言葉は別途チーム内で共有してください。</p></div></header>
    <section class="admin-card admin-share-card"><div class="admin-share-grid"><div class="admin-share-content"><label>選手用URL<div class="admin-copy-row"><input class="text-input" id="team-player-url" readonly value="${esc(playerUrl)}"><button class="button button-primary" id="copy-player-url" type="button">コピー</button></div></label><div class="admin-share-actions"><button class="button line-share-button" id="share-player-line" type="button">LINEで共有</button><button class="button button-secondary" id="share-player-native" type="button">その他で共有</button></div><p class="admin-help" id="copy-player-status">URL・QRコードには合言葉を含めません。</p></div><div class="admin-qr-wrap"><div class="admin-qr"><img src="${esc(qrSrc)}" alt="${esc(team.name)}の選手用ページQRコード" width="220" height="220"><span class="admin-qr-logo"><img src="${ICON}" alt=""></span></div><p>現在の環境URLから生成</p></div></div></section>
  </div>`;
}

function teamAdminsContent(teamId, team, auth, adminManagement, entitlements = {}) {
  const management = adminManagement || null;
  const owner = management?.currentRole === "owner";
  const members = management?.members || [];
  const admins = members.filter((member) => member.role === "admin");
  const maxSubAdmins = Number(management?.maxSubAdmins || 5);
  const pending = Number(management?.pendingSubAdminInvites || 0);
  const canUseSubAdmins = featureEnabled(entitlements, "sub_admin_management");
  const summary = auth?.type === "account"
    ? `<section class="team-admin-summary-strip" aria-label="管理者の状況"><div><strong>${members.length}</strong><span>管理者合計</span></div><div><strong>${admins.length}/${maxSubAdmins}</strong><span>サブ管理者</span></div><div><strong>${pending}</strong><span>承認待ち</span></div></section>`
    : "";
  const inviteButton = owner
    ? canUseSubAdmins
      ? `<button class="button button-primary" id="open-admin-invite" type="button" ${management?.canInviteSubAdmin === false ? "disabled" : ""}>＋ サブ管理者を招待</button>`
      : `<button class="button button-primary" data-premium-feature="サブ管理者" data-premium-description="Freeプランはメイン管理者1名で利用します。Plus / Proではサブ管理者を最大5名まで追加できます。" type="button">＋ サブ管理者を招待 ${paidFeatureBadge("Plus")}</button>`
    : "";
  return `<div class="team-admin-view"><header class="team-admin-page-head"><div><h1>管理者</h1><p>メイン管理者とサブ管理者だけを管理します。OAuth認証（Google / LINE）はFreeプランでも利用できます。</p></div>${inviteButton}</header>
    ${!canUseSubAdmins && auth?.type === "account" ? `<div class="notice notice-info"><strong>サブ管理者の追加はPlus / Pro機能です</strong><br>既存のサブ管理者データは削除されません。Freeプラン中はメイン管理者のみ管理画面を利用できます。<br>${esc(PAID_LIMITED_MESSAGE)}</div>` : ""}
    ${summary}
    ${adminIdentitySection(teamId, team, auth, management) || notice("管理者情報を取得できませんでした。画面を再読み込みしてください。", "error")}
  </div>`;
}

function teamPlanAuthContent(teamId, team, plan, auth, adminManagement, entitlements = {}) {
  const authLabel = auth?.type === "account" ? "Google / LINEアカウント認証" : "旧管理者パスワード認証";
  const roleLabel = auth?.type === "account" ? (auth?.role === "owner" ? "メイン管理者" : "サブ管理者") : "共有パスワード";
  const legacyEnabled = auth?.type === "account" ? Boolean(adminManagement?.legacyPasswordEnabled) : true;
  const features = [
    ["基本的なサイン登録・練習", true, "Free"],
    ["Google / LINE OAuth認証", true, "Free"],
    ["複数サイングループ", featureEnabled(entitlements, "multiple_sign_groups"), "Plus"],
    ["1サイン複数動画", featureEnabled(entitlements, "multiple_sign_videos"), "Plus"],
    ["動画プレビュー開始位置の秒数指定", featureEnabled(entitlements, "custom_video_thumbnail"), "Plus"],
    ["サブ管理者（最大5名）", featureEnabled(entitlements, "sub_admin_management"), "Plus"],
    ["練習成績・苦手分析", featureEnabled(entitlements, "practice_analytics"), "Pro"],
    ["最近のアクティビティ・監査ログ", featureEnabled(entitlements, "activity_log"), "Pro"]
  ];
  return `<div class="team-admin-view"><header class="team-admin-page-head"><div><h1>プラン・認証</h1><p>現在のプランと認証方式を確認できます。OAuth認証はFreeプランでも利用できます。</p></div></header>
    <section class="admin-plan-card"><div><div class="admin-plan-title"><h2>${esc(plan.name || "Free")}</h2><span class="admin-plan-price">${plan.isFree ? "Free" : "限定提供"}</span></div><p>${plan.code === "team_pro" ? "Plusのチーム運用機能に加えて、成績分析・監査ログまで利用できます。" : plan.code === "team_plus" ? "複数グループ・複数動画・サブ管理者など、チーム運用を強化できます。" : "基本的なサイン登録・練習、規定の1グループ、メイン管理者1名で利用できます。"}</p><div class="admin-plan-feature-list">${features.map(([label, enabled, requiredPlan]) => `<span class="admin-plan-feature ${enabled ? "is-enabled" : "is-locked"}">${enabled ? "✓" : "🔒"} ${esc(label)}${enabled ? "" : " " + paidFeatureBadge(String(requiredPlan))}</span>`).join("")}</div></div><div class="admin-plan-future"><strong>Plus / Proは現在、特定チーム限定で提供しています</strong><span>${esc(PAID_LIMITED_MESSAGE)} プランの変更はSYSTEM管理者が行います。</span></div></section>
    <section class="admin-card team-admin-settings-summary"><div class="admin-section-heading"><div><h2>認証方式</h2></div><a class="button button-secondary" href="${teamAdminHref(teamId, "admins")}">管理者を管理</a></div><dl><div><dt>現在の認証</dt><dd>${esc(authLabel)}</dd></div><div><dt>あなたの権限</dt><dd>${esc(roleLabel)}</dd></div><div><dt>旧共有パスワード</dt><dd>${legacyEnabled ? "有効" : "無効"}</dd></div></dl><p class="admin-help">Google / LINE OAuth認証自体はFreeプランでも利用できます。</p></section>
  </div>`;
}

function teamNoticesContent(notices) {
  const fixedCount = notices.filter((item) => item.source === "fixed").length;
  const systemCount = notices.length - fixedCount;
  return `<div class="team-admin-view"><header class="team-admin-page-head"><div><h1>システムのお知らせ</h1><p>アカウント・プランなどチーム固有の案内を上部に、その下へ運営からのお知らせを表示します。</p></div></header><section class="admin-card admin-card--flush-mobile"><div class="team-admin-page-summary"><strong>${notices.length}</strong><span>お知らせ</span><span class="system-admin-summary-note">固定 ${fixedCount} / 運営 ${systemCount}</span></div>${pagedCollection(teamNoticeList(notices), notices.length, { pageSize: 10, label: "システムのお知らせ" })}</section></div>`;
}

function teamSettingsContent(team, auth, accountManaged = false) {
  const authLabel = auth?.type === "account" ? "Google / LINEアカウント認証" : "旧管理者パスワード認証";
  const canWithdraw = auth?.type === "account" ? auth?.role === "owner" : !accountManaged;
  const withdrawHelp = auth?.type === "account" && auth?.role !== "owner"
    ? "チーム自体の退会はメイン管理者のみ手続きできます。チームの退会を希望する場合は、メイン管理者へご連絡ください。あなた自身がサブ管理者を退会する場合は、「管理者」画面から手続きできます。"
    : auth?.type !== "account" && accountManaged
      ? "管理者アカウントへ移行済みのため、メイン管理者がGoogle / LINEでログインして手続きしてください。"
      : "退会すると選手用ページと管理画面を利用できなくなります。登録済みデータは誤操作からの復旧や監査のため直ちには物理削除せず、運営管理下で利用停止状態になります。";
  return `<div class="team-admin-view"><header class="team-admin-page-head"><div><h1>チーム設定</h1><p>普段は確認だけ。変更するときだけ編集ダイアログを開きます。</p></div><button class="button button-primary" id="open-team-settings" type="button">設定を変更</button></header><section class="admin-card team-admin-settings-summary"><dl><div><dt>チーム名</dt><dd>${esc(team.name)}</dd></div><div><dt>選手用合言葉</dt><dd>設定済み</dd></div><div><dt>管理者認証</dt><dd>${esc(authLabel)}</dd></div></dl><p class="admin-help">合言葉の変更やチーム名の変更は「設定を変更」から行えます。</p></section><section class="admin-card team-withdraw-card"><div><span class="team-withdraw-kicker">DANGER ZONE</span><h2>チームの退会</h2><p>${esc(withdrawHelp)}</p></div>${canWithdraw ? `<button class="button button-danger" id="open-team-withdraw" type="button">退会手続き</button>` : `<span class="admin-status admin-status--suspended">手続き不可</span>`}</section></div>`;
}

async function renderTeamDashboard(teamId, { message = "", view = teamAdminViewFromPath() } = {}) {
  closeTeamAdminMobileMenu();
  shell("チーム管理", `<section class="admin-card admin-loading"><div class="spinner"></div><h1>管理画面を読み込んでいます…</h1></section>`);
  const { response, data } = await requestJson(`/api/team-admin/team?teamId=${encodeURIComponent(teamId)}`);
  if (response.status === 401) return renderTeamAdmin(teamId);
  if (!response.ok) return shell("チーム管理", `<section class="admin-card"><h1>読み込めませんでした</h1>${notice(data.message || "もう一度お試しください。", "error")}</section>`);
  const team = data.team;
  const signs = data.signs || [];
  const groups = data.groups || [];
  const auth = data.auth || {};
  const adminManagement = data.adminManagement || null;
  const accountManaged = Boolean(data.accountManaged);
  const planState = data.plan || {};
  const plan = planState.plan || { code: "free", name: "Free", isFree: true, availableForPurchase: false };
  const entitlements = planState.entitlements || {};
  const playerUrl = teamUrl(teamId);
  const totalVideos = signs.reduce((sum, sign) => sum + (sign.videoItems || []).length, 0);
  const contextualNotices = teamSystemNotices({ team, auth, adminManagement, plan, groups, signs });
  const publishedSystemNotices = (await fetchPublishedSystemNotices()).map((item) => ({ ...item, source: "system" }));
  const notices = [...contextualNotices, ...publishedSystemNotices];
  const canUseActivity = featureEnabled(entitlements, "activity_log");
  const activity = canUseActivity && (view === "dashboard" || view === "activity") ? await fetchTeamActivity(teamId) : [];
  let viewContent = "";
  if (view === "activity") viewContent = teamActivityContent(activity, signs, groups, entitlements);
  else if (view === "groups") viewContent = teamGroupsContent(groups, signs, entitlements);
  else if (view === "signs") viewContent = teamSignsContent(signs, groups, entitlements);
  else if (view === "share") viewContent = teamShareContent(team, playerUrl, await qrImageUrl(playerUrl, 320));
  else if (view === "admins") viewContent = teamAdminsContent(teamId, team, auth, adminManagement, entitlements);
  else if (view === "plan-auth") viewContent = teamPlanAuthContent(teamId, team, plan, auth, adminManagement, entitlements);
  else if (view === "notices") viewContent = teamNoticesContent(notices);
  else if (view === "settings") viewContent = teamSettingsContent(team, auth, accountManaged);
  else viewContent = teamDashboardContent(teamId, team, groups, signs, totalVideos, plan, entitlements, notices, auth, adminManagement, activity);
  const body = `${message ? notice(message, "success") : ""}${teamAdminFrame(teamId, team.name, view, viewContent, notices.length, entitlements)}`;
  shell("チーム管理", body, adminHeaderActions(adminHeaderMenuButton("team-admin-menu-open", "team-admin-mobile-menu-screen"), teamAdminHref(teamId, "notices"), notices.length));
  wireTeamDashboard(teamId, team, groups, signs, playerUrl, auth, adminManagement, entitlements);
}

function teamGroupCard(group, signs) {
  const members = signs.filter((sign) => Number(sign.groupId) === Number(group.id));
  const hasVideo = Boolean(group.videoId);
  const thumb = hasVideo ? youtubeThumbnailUrl(group.videoId) : "";
  return `<article class="admin-group-card" data-group-id="${Number(group.id)}" data-group-search-text="${esc(String(group.name || "").toLocaleLowerCase("ja-JP"))}" data-page-item>
    <div class="admin-group-card-main">
      ${hasVideo ? `<button class="admin-group-video-thumb" data-preview-group-video="${esc(group.videoId)}" data-group-title="${esc(group.name)}" type="button" aria-label="${esc(group.name)}の説明動画を再生">${thumb ? `<img src="${esc(thumb)}" alt="" loading="lazy" referrerpolicy="no-referrer">` : ""}<span class="admin-group-video-shade"></span><span class="admin-group-video-play">▶</span><span class="admin-group-video-label">説明動画</span></button>` : ""}
      <div><div class="admin-group-title-row"><h3>${esc(group.name)}</h3><span class="admin-status ${group.enabled ? "admin-status--active" : "admin-status--suspended"}">${group.enabled ? "使用中" : "停止中"}</span></div><p>${group.description ? esc(group.description) : "説明文は未登録です。"}</p><div class="admin-group-meta"><span>${members.length}サイン</span><span>${hasVideo ? "説明動画あり" : "説明動画なし"}</span></div></div>
    </div>
    <div class="admin-group-actions"><button class="button button-ghost" data-edit-group="${Number(group.id)}" type="button">編集</button></div>
  </article>`;
}

function teamSignCard(sign, index, groups = [], entitlements = {}, moveState = {}) {
  const videos = sign.videoItems || [];
  const canAddMultipleVideos = featureEnabled(entitlements, "multiple_sign_videos");
  const enabledVideos = videos.filter((video) => video.enabled).length;
  const group = groups.find((item) => Number(item.id) === Number(sign.groupId));
  const canMoveUp = moveState.canMoveUp !== false;
  const canMoveDown = moveState.canMoveDown !== false;
  return `<article class="admin-sign-card admin-sign-card--summary" data-sign-id="${Number(sign.dbId)}" data-sign-search-text="${esc([sign.name, group?.name, ...(videos.map((video) => video.comment || ""))].join(" "))}" data-page-item>
    <div class="admin-sign-summary-head"><div class="admin-sign-index">${index + 1}</div><div class="admin-sign-summary-title"><div class="admin-sign-title-line"><h3>${esc(sign.name)}</h3><span class="admin-status ${sign.enabled ? "admin-status--active" : "admin-status--suspended"}">${sign.enabled ? "使用中" : "停止中"}</span></div><p>${group ? `${esc(group.name)} · ` : "未分類 · "}${videos.length}動画 / ${enabledVideos}動画を出題対象${videos.length > 1 ? " · 複数動画は偏りを抑えて出題" : ""}</p></div><div class="admin-sign-head-actions"><div class="admin-sign-move" aria-label="サインの並び順"><button class="admin-sign-move-button" data-move-sign="${Number(sign.dbId)}" data-move-direction="up" type="button" aria-label="${esc(sign.name)}を上へ移動" title="上へ移動" ${canMoveUp ? "" : "disabled"}>↑</button><button class="admin-sign-move-button" data-move-sign="${Number(sign.dbId)}" data-move-direction="down" type="button" aria-label="${esc(sign.name)}を下へ移動" title="下へ移動" ${canMoveDown ? "" : "disabled"}>↓</button></div><button class="button button-secondary admin-edit-sign" data-edit-sign="${Number(sign.dbId)}" type="button">編集</button></div></div>
    <div class="admin-video-list admin-video-list--summary">${videos.length ? videos.map((video, vIndex) => teamVideoRow(sign, video, vIndex)).join("") : `<div class="admin-empty admin-empty--compact"><strong>動画未登録</strong><p>このサインはまだ出題できません。</p></div>`}</div>
    <div class="admin-sign-footer">${videos.length < 1 || canAddMultipleVideos ? `<button class="button button-secondary" data-add-video="${Number(sign.dbId)}" type="button">＋ 動画を追加</button>` : `<button class="button button-secondary" data-premium-feature="複数動画" data-premium-description="Freeプランでは1サイン1動画までです。Plus / Proでは同じサインに複数パターンを登録できます。" type="button">＋ 動画を追加 ${paidFeatureBadge("Plus")}</button>`}</div>
  </article>`;
}

function youtubeThumbnailUrl(videoId) {
  const id = String(videoId || "").trim();
  return /^[A-Za-z0-9_-]{11}$/.test(id) ? `https://i.ytimg.com/vi/${encodeURIComponent(id)}/hqdefault.jpg` : "";
}

function teamVideoRow(sign, video, index) {
  const comment = String(video.comment || "").trim();
  const thumb = youtubeThumbnailUrl(video.videoId);
  const previewAt = Math.max(0, Math.trunc(Number(video.thumbnailTimeSeconds) || 0));
  return `<div class="admin-video-row admin-video-row--summary" data-video-id="${Number(video.id)}">
    <button class="admin-video-preview-thumb" data-preview-video="${Number(video.id)}" data-video-id-value="${esc(video.videoId)}" data-video-start="${previewAt}" data-video-title="${esc(`${sign.name} / 動画${index + 1}`)}" type="button" aria-label="動画をプレビュー">${thumb ? `<img src="${esc(thumb)}" alt="" loading="lazy" referrerpolicy="no-referrer"><span class="admin-video-thumb-shade"></span>` : ""}<span class="admin-video-play">▶</span><span class="admin-video-thumb-label">動画${index + 1}${previewAt ? ` · ${previewAt}秒から確認` : ""}</span></button>
    <div class="admin-video-summary-copy"><div class="admin-video-summary-top"><strong>${comment ? esc(comment) : `動画${index + 1}`}</strong><span class="admin-status ${video.enabled ? "admin-status--active" : "admin-status--suspended"}">${video.enabled ? "有効" : "無効"}</span></div><p class="admin-video-id">YouTube: ${esc(video.videoId)}</p>${comment ? `<p class="admin-video-comment">${esc(comment)}</p>` : `<p class="admin-video-comment admin-video-comment--empty">用途メモなし</p>`}${previewAt ? `<p class="admin-video-comment">プレビュー開始位置：${previewAt}秒</p>` : ""}</div>
    <div class="admin-video-summary-actions"><button class="button button-ghost" data-edit-video="${Number(video.id)}" data-sign-id="${Number(sign.dbId)}" type="button">編集</button></div>
  </div>`;
}

function openTeamSettingsModal(teamId, team, auth: JsonRecord = {}) {
  openAdminModal({
    title: "チーム設定",
    kicker: team.name,
    body: `<div id="admin-modal-error"></div><form id="team-settings-modal-form" class="admin-form"><label>チーム名<input class="text-input" name="name" type="text" maxlength="80" value="${esc(team.name)}" required></label><label>選手用合言葉を変更 <span class="admin-optional">変更時のみ</span><input class="text-input" name="passphrase" type="text" autocomplete="off"></label>${team.legacyPasswordEnabled && (auth.type === "legacy-password" || auth.role === "owner") ? `<label>旧管理者パスワードを変更 <span class="admin-optional">変更時のみ・12文字以上＋英字＋数字</span><input class="text-input" name="adminPassword" type="password" minlength="12" autocomplete="new-password"></label><p class="admin-help">合言葉や旧管理者パスワードを変更すると、対象の既存セッションは安全のため失効します。</p>` : team.legacyPasswordEnabled ? `<div class="admin-security-note"><strong>旧管理者パスワードはオーナー管理</strong><p>管理者アカウントではチーム名・選手用合言葉を変更できます。旧共有パスワードの変更・無効化はオーナーのみ行えます。</p></div>` : `<div class="admin-security-note"><strong>管理者はアカウント認証です</strong><p>共有の管理者パスワードは無効化されています。</p></div>`}<button class="button button-primary button-full" type="submit">保存する</button></form>`,
    onOpen(layer) {
      layer.querySelector("#team-settings-modal-form")?.addEventListener("submit", async (event) => {
        event.preventDefault();
        const submit = event.currentTarget.querySelector("button[type=submit]");
        const payload = { teamId, ...Object.fromEntries(new FormData(event.currentTarget as HTMLFormElement).entries()) } as JsonRecord;
        if (payload.adminPassword && !isValidAdminCredential(payload.adminPassword)) return modalError(adminCredentialMessage());
        setButtonBusy(submit, true);
        const { response, data } = await requestJson("/api/team-admin/team", { method: "PUT", body: JSON.stringify(payload) });
        if (!response.ok) { setButtonBusy(submit, false); return modalError(data.message || "保存できませんでした。"); }
        closeAdminModal(); renderTeamDashboard(teamId, { message: "チーム設定を保存しました。" });
      });
    }
  });
}

function openTeamWithdrawModal(teamId, team, auth: JsonRecord = {}) {
  openAdminModal({
    title: "チームの退会手続き",
    kicker: team.name,
    body: `<div id="admin-modal-error"></div><div class="team-withdraw-warning"><strong>この操作を行うと、このチームは利用できなくなります。</strong><p>選手用ページ・チーム管理画面は停止します。誤操作防止のため、チーム名と「退会する」を入力してください。</p></div><form id="team-withdraw-form" class="admin-form"><label>チーム名<input class="text-input" id="team-withdraw-name" name="teamName" autocomplete="off" placeholder="${esc(team.name)}" required></label><label>確認文字 <span class="admin-optional">「退会する」と入力</span><input class="text-input" id="team-withdraw-confirm" name="confirm" autocomplete="off" required></label><button class="button button-danger button-full" id="confirm-team-withdraw" type="submit" disabled>チームを退会する</button></form>`,
    onOpen(layer) {
      const form = layer.querySelector<HTMLFormElement>("#team-withdraw-form");
      const nameInput = layer.querySelector<HTMLInputElement>("#team-withdraw-name");
      const confirmInput = layer.querySelector<HTMLInputElement>("#team-withdraw-confirm");
      const submit = layer.querySelector<HTMLButtonElement>("#confirm-team-withdraw");
      const updateState = () => { if (submit) submit.disabled = nameInput?.value.trim().normalize("NFC") !== String(team.name).trim().normalize("NFC") || confirmInput?.value.trim().normalize("NFC") !== "退会する"; };
      nameInput?.addEventListener("input", updateState);
      confirmInput?.addEventListener("input", updateState);
      form?.addEventListener("submit", async (event) => {
        event.preventDefault();
        if (!submit || submit.disabled) return;
        setButtonBusy(submit, true, "退会処理中…");
        const { response, data } = await requestJson("/api/team-admin/team", { method: "DELETE", body: JSON.stringify({ teamId, teamName: nameInput?.value || "", confirm: confirmInput?.value || "" }) });
        if (!response.ok) {
          setButtonBusy(submit, false);
          if (handleFreshAuthResponse(response, data, teamAdminCurrentPath(teamId))) { closeAdminModal(); return; }
          return modalError(data.message || "退会手続きを完了できませんでした。");
        }
        closeAdminModal();
        location.href = auth?.type === "account" ? "/account" : "/";
      });
    }
  });
}

function openGroupModal(teamId, group = null) {
  const editing = Boolean(group);
  openAdminModal({
    title: editing ? "グループを編集" : "グループを追加",
    body: `<div id="admin-modal-error"></div>${editing ? "" : `<section class="group-use-cases"><div class="group-use-cases-head"><strong>こんな分け方ができます</strong><span>例を選ぶとグループ名と説明に入ります</span></div><div class="group-use-case-grid"><button type="button" class="group-use-case" data-group-example-name="バッティングサイン" data-group-example-description="バント、エンドランなど、攻撃時にベンチから出すサインをまとめます。"><b>バッティングサイン</b><small>攻撃時の作戦・打撃サイン</small></button><button type="button" class="group-use-case" data-group-example-name="守備サイン（ランナーなし）" data-group-example-description="ランナーがいない場面で使う守備連携やキャッチャーのサインパターンをまとめます。"><b>守備サイン（ランナーなし）</b><small>走者なしの基本パターン</small></button><button type="button" class="group-use-case" data-group-example-name="守備サイン（2塁ランナーあり）" data-group-example-description="2塁ランナーがいる場面で使う守備サインを分けて管理します。キャッチャーのサインを見られやすい状況に備え、別パターンを練習できます。"><b>守備サイン（2塁ランナーあり）</b><small>2塁走者がいる場面の別パターン</small></button><button type="button" class="group-use-case" data-group-example-name="ピッチングサイン" data-group-example-description="球種・コース・けん制など、投手と捕手を中心に使うサインをまとめます。"><b>ピッチングサイン</b><small>球種・コース・けん制など</small></button><button type="button" class="group-use-case" data-group-example-name="走塁サイン" data-group-example-description="盗塁、スタート、スクイズなど、ランナー向けの走塁サインをまとめます。"><b>走塁サイン</b><small>ランナー向けの走塁指示</small></button></div><p>チームの運用に合わせて自由に名前を変更できます。Freeは1グループ、Plus / Proでは複数グループを作成できます。</p></section>`}<form id="group-modal-form" class="admin-form"><label>グループ名<input class="text-input" name="name" maxlength="80" value="${esc(group?.name || "")}" placeholder="例：守備サイン（2塁ランナーあり）" required></label><label>グループの説明<textarea class="text-input admin-textarea" name="description" maxlength="1200" placeholder="例：2塁ランナーがいる場面で使う守備サイン。">${esc(group?.description || "")}</textarea></label><label>説明用YouTube URL <span class="admin-optional">任意</span><input class="text-input" name="youtubeUrl" type="url" inputmode="url" value="${esc(group?.youtubeUrl || "")}" placeholder="https://youtube.com/..."></label>${editing ? `<label>並び順<input class="text-input" name="sortOrder" type="number" value="${Number(group.sortOrder || 0)}"></label><label class="admin-toggle admin-toggle--panel"><input name="enabled" type="checkbox" ${group.enabled ? "checked" : ""}><span>選手画面で使用する</span></label>` : ""}<div class="admin-modal-actions"><button class="button button-primary" type="submit">${editing ? "保存する" : "追加する"}</button>${editing ? `<button class="button button-danger" id="delete-group-in-modal" type="button">グループを削除</button>` : ""}</div></form>`,
    onOpen(layer) {
      layer.querySelectorAll<HTMLElement>("[data-group-example-name]").forEach((example) => example.addEventListener("click", () => {
        const nameInput = layer.querySelector<HTMLInputElement>('input[name="name"]');
        const descriptionInput = layer.querySelector<HTMLTextAreaElement>('textarea[name="description"]');
        if (nameInput) nameInput.value = example.dataset.groupExampleName || "";
        if (descriptionInput) descriptionInput.value = example.dataset.groupExampleDescription || "";
        nameInput?.focus();
      }));
      layer.querySelector("#group-modal-form")?.addEventListener("submit", async (event) => {
        event.preventDefault(); const fd = new FormData(event.currentTarget as HTMLFormElement); const submit = event.currentTarget.querySelector("button[type=submit]"); setButtonBusy(submit, true);
        const payload: JsonRecord = { teamId, name: fd.get("name"), description: fd.get("description"), youtubeUrl: fd.get("youtubeUrl") };
        if (editing) { payload.sortOrder = Number(fd.get("sortOrder")); payload.enabled = fd.get("enabled") === "on"; }
        const endpoint = editing ? `/api/team-admin/groups/${encodeURIComponent(group.id)}` : "/api/team-admin/groups";
        const { response, data } = await requestJson(endpoint, { method: editing ? "PUT" : "POST", body: JSON.stringify(payload) });
        if (!response.ok) { setButtonBusy(submit, false); return modalError(data.message || "グループを保存できませんでした。"); }
        closeAdminModal(); renderTeamDashboard(teamId, { message: editing ? "グループを保存しました。" : "グループを追加しました。" });
      });
      layer.querySelector("#delete-group-in-modal")?.addEventListener("click", async () => {
        if (!confirm("このグループを削除しますか？所属サインは未分類になります。")) return;
        const { response, data } = await requestJson(`/api/team-admin/groups/${encodeURIComponent(group.id)}?teamId=${encodeURIComponent(teamId)}`, { method: "DELETE" });
        if (!response.ok) return modalError(data.message || "削除できませんでした。");
        closeAdminModal(); renderTeamDashboard(teamId, { message: "グループを削除しました。所属サインは未分類になりました。" });
      });
    }
  });
}

function openSignModal(teamId, groups, sign = null, defaultGroupId = null) {
  const editing = Boolean(sign);
  const selectedGroupId = editing ? sign?.groupId : defaultGroupId;
  openAdminModal({
    title: editing ? "サインを編集" : "サインを追加",
    body: `<div id="admin-modal-error"></div><form id="sign-modal-form" class="admin-form"><label>サイン名<input class="text-input" name="name" type="text" maxlength="80" value="${esc(sign?.name || "")}" placeholder="例：ヒットエンドラン" required></label><label>サイングループ<select class="text-input" name="groupId"><option value="">未分類</option>${groups.map((g) => `<option value="${Number(g.id)}" ${Number(selectedGroupId) === Number(g.id) ? "selected" : ""}>${esc(g.name)}</option>`).join("")}</select></label>${editing ? `<label class="admin-toggle admin-toggle--panel"><input name="enabled" type="checkbox" ${sign.enabled ? "checked" : ""}><span>練習で使用する</span></label><p class="admin-help">並び順は一覧の ↑ / ↓ ボタンで変更できます。</p>` : `<label>最初のYouTube URL <span class="admin-optional">あとからでも追加できます</span><input class="text-input" name="youtubeUrl" type="url" inputmode="url" placeholder="https://youtube.com/shorts/..."></label><label>動画コメント <span class="admin-optional">任意</span><textarea class="text-input admin-textarea" name="videoComment" maxlength="300" placeholder="例：監督の正面から撮影。試合前の確認用"></textarea></label>`}<div class="admin-modal-actions"><button class="button button-primary" type="submit">${editing ? "保存する" : "追加する"}</button>${editing ? `<button class="button button-danger" id="delete-sign-in-modal" type="button">サインを削除</button>` : ""}</div></form>`,
    onOpen(layer) {
      layer.querySelector("#sign-modal-form")?.addEventListener("submit", async (event) => {
        event.preventDefault(); const fd = new FormData(event.currentTarget as HTMLFormElement); const submit = event.currentTarget.querySelector("button[type=submit]"); setButtonBusy(submit, true);
        const payload = editing ? { teamId, name: fd.get("name"), groupId: fd.get("groupId") || null, enabled: fd.get("enabled") === "on" } : { teamId, name: fd.get("name"), groupId: fd.get("groupId") || null, youtubeUrl: fd.get("youtubeUrl"), videoComment: fd.get("videoComment") };
        const endpoint = editing ? `/api/team-admin/signs/${encodeURIComponent(sign.dbId)}` : "/api/team-admin/signs";
        const { response, data } = await requestJson(endpoint, { method: editing ? "PUT" : "POST", body: JSON.stringify(payload) });
        if (!response.ok) { setButtonBusy(submit, false); return modalError(data.message || "保存できませんでした。"); }
        closeAdminModal(); renderTeamDashboard(teamId, { message: editing ? "サインを保存しました。" : "サインを追加しました。" });
      });
      layer.querySelector("#delete-sign-in-modal")?.addEventListener("click", async () => {
        if (!confirm(`「${sign.name}」を削除しますか？登録動画も削除されます。`)) return;
        const { response, data } = await requestJson(`/api/team-admin/signs/${encodeURIComponent(sign.dbId)}?teamId=${encodeURIComponent(teamId)}`, { method: "DELETE" });
        if (!response.ok) return modalError(data.message || "削除できませんでした。");
        closeAdminModal(); renderTeamDashboard(teamId, { message: "サインを削除しました。" });
      });
    }
  });
}

function openVideoModal(teamId, sign, video = null, entitlements = {}) {
  const editing = Boolean(video);
  openAdminModal({
    title: editing ? "動画を編集" : "動画を追加",
    kicker: sign.name,
    body: `<div id="admin-modal-error"></div><form id="video-modal-form" class="admin-form"><label>YouTube URL<input class="text-input" name="youtubeUrl" type="url" inputmode="url" value="${esc(video?.youtubeUrl || "")}" placeholder="https://youtube.com/shorts/..." required></label><label>この動画の用途・補足 <span class="admin-optional">任意</span><textarea class="text-input admin-textarea" name="comment" maxlength="300" placeholder="例：横から撮影。帽子→胸の動きを確認しやすい">${esc(video?.comment || "")}</textarea></label>${featureEnabled(entitlements, "custom_video_thumbnail") ? `<label>動画プレビュー開始位置 <span class="admin-optional">限定機能・秒</span><input class="text-input" name="thumbnailTimeSeconds" type="number" min="0" max="86400" step="1" value="${Math.max(0, Math.trunc(Number(video?.thumbnailTimeSeconds) || 0))}"><span class="admin-help">YouTubeの一覧画像はYouTube標準サムネイルを使います。指定秒は管理画面のプレビュー開始位置として反映します。</span></label>` : `<div class="paid-feature-compact"><strong>プレビュー開始位置の指定 ${paidFeatureBadge("Plus")}</strong><p>通常はYouTubeが選ぶサムネイルを表示します。Plus / Proでは、確認したい秒数をプレビュー開始位置に指定できます。</p></div>`}${editing ? `<label>並び順<input class="text-input" name="sortOrder" type="number" value="${Number(video.sortOrder || 0)}"></label><label class="admin-toggle admin-toggle--panel"><input name="enabled" type="checkbox" ${video.enabled ? "checked" : ""}><span>この動画を出題に使う</span></label>` : ""}<div class="admin-modal-actions"><button class="button button-primary" type="submit">${editing ? "保存する" : "動画を追加"}</button>${editing ? `<button class="button button-danger" id="delete-video-in-modal" type="button">動画を削除</button>` : ""}</div></form>`,
    onOpen(layer) {
      layer.querySelector("#video-modal-form")?.addEventListener("submit", async (event) => {
        event.preventDefault(); const fd = new FormData(event.currentTarget as HTMLFormElement); const submit = event.currentTarget.querySelector("button[type=submit]"); setButtonBusy(submit, true);
        const thumbnailTimeSeconds = Math.max(0, Math.trunc(Number(fd.get("thumbnailTimeSeconds")) || 0));
        const payload = editing ? { teamId, youtubeUrl: fd.get("youtubeUrl"), comment: fd.get("comment"), sortOrder: Number(fd.get("sortOrder")), enabled: fd.get("enabled") === "on", ...(featureEnabled(entitlements, "custom_video_thumbnail") ? { thumbnailTimeSeconds } : {}) } : { teamId, youtubeUrl: fd.get("youtubeUrl"), comment: fd.get("comment"), ...(featureEnabled(entitlements, "custom_video_thumbnail") ? { thumbnailTimeSeconds } : {}) };
        const endpoint = editing ? `/api/team-admin/videos/${encodeURIComponent(video.id)}` : `/api/team-admin/signs/${encodeURIComponent(sign.dbId)}/videos`;
        const { response, data } = await requestJson(endpoint, { method: editing ? "PUT" : "POST", body: JSON.stringify(payload) });
        if (!response.ok) { setButtonBusy(submit, false); return modalError(data.message || "動画を保存できませんでした。"); }
        closeAdminModal(); renderTeamDashboard(teamId, { message: editing ? "動画を保存しました。" : "動画を追加しました。" });
      });
      layer.querySelector("#delete-video-in-modal")?.addEventListener("click", async () => {
        if (!confirm("この動画を削除しますか？")) return;
        const { response, data } = await requestJson(`/api/team-admin/videos/${encodeURIComponent(video.id)}?teamId=${encodeURIComponent(teamId)}`, { method: "DELETE" });
        if (!response.ok) return modalError(data.message || "削除できませんでした。");
        closeAdminModal(); renderTeamDashboard(teamId, { message: "動画を削除しました。" });
      });
    }
  });
}

function openVideoPreview(videoId, title, startSeconds = 0) {
  if (!/^[A-Za-z0-9_-]{11}$/.test(videoId || "")) return;
  const start = Math.max(0, Math.trunc(Number(startSeconds) || 0));
  const src = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoId)}?playsinline=1&rel=0&controls=1&fs=1${start ? `&start=${start}` : ""}`;
  openAdminModal({ title: title || "動画を確認", wide: true, body: `<div class="admin-video-preview"><iframe src="${src}" title="${esc(title || "YouTube動画")}" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowfullscreen loading="eager"></iframe></div><p class="admin-help">管理画面内で内容を確認できます。閉じると再生も終了します。</p>` });
}

function wireTeamDashboard(teamId, team, groups, signs, playerUrl, auth = {}, adminManagement = null, entitlements = {}) {
  wirePagedCollections();
  document.querySelector("#team-admin-menu-open")?.addEventListener("click", () => document.querySelector("#team-admin-mobile-menu-screen")?.hasAttribute("hidden") ? openTeamAdminMobileMenu() : closeTeamAdminMobileMenu());
  document.querySelectorAll("[data-team-admin-menu-close]").forEach((button) => button.addEventListener("click", closeTeamAdminMobileMenu));
  document.querySelectorAll(".team-admin-mobile-menu-link").forEach((link) => link.addEventListener("click", closeTeamAdminMobileMenu));
  const teamLogout = async () => { await fetch("/api/team-admin/logout", { method: "POST" }); closeTeamAdminMobileMenu(); renderTeamAdmin(teamId); };
  document.querySelector("#team-admin-logout")?.addEventListener("click", teamLogout);
  document.querySelector("#team-menu-logout")?.addEventListener("click", teamLogout);
  wireOAuthAvailability();
  document.querySelectorAll<HTMLElement>("[data-premium-feature]").forEach((button) => button.addEventListener("click", () => openLimitedFeatureModal(button.dataset.premiumFeature || "限定機能", button.dataset.premiumDescription || "")));
  document.querySelector("#open-admin-invite")?.addEventListener("click", () => openAdminInviteModal(teamId));
  document.querySelector("#open-owner-transfer")?.addEventListener("click", () => openOwnerTransferModal(teamId, adminManagement || { members: [] }));
  document.querySelector("#disable-legacy-password")?.addEventListener("click", async () => {
    if (!confirm("旧管理者パスワードでのログインを無効化します。Google / LINEアカウントでログインできることを確認済みですか？")) return;
    const { response, data } = await requestJson(`/api/team-admin/legacy-password/disable?teamId=${encodeURIComponent(teamId)}`, { method: "POST" });
    if (!response.ok) { if (handleFreshAuthResponse(response, data, teamAdminCurrentPath(teamId))) return; return alert(data.message || "無効化できませんでした。"); }
    renderTeamDashboard(teamId, { message: "旧管理者パスワードを無効化しました。" });
  });
  document.querySelector("#leave-team-admin")?.addEventListener("click", async () => {
    if (!confirm("このチームの管理者から退会しますか？以後、このチームの管理画面には入れません。")) return;
    const { response, data } = await requestJson(`/api/team-admin/membership?teamId=${encodeURIComponent(teamId)}`, { method: "DELETE" });
    if (!response.ok) { if (handleFreshAuthResponse(response, data, teamAdminCurrentPath(teamId))) return; return alert(data.message || "退会できませんでした。"); }
    location.href = "/account";
  });
  document.querySelectorAll("[data-remove-admin]").forEach((button) => button.addEventListener("click", async () => {
    if (!confirm("この人をサブ管理者から外しますか？")) return;
    const { response, data } = await requestJson(`/api/team-admin/admins/${encodeURIComponent(button.dataset.removeAdmin)}?teamId=${encodeURIComponent(teamId)}`, { method: "DELETE" });
    if (!response.ok) { if (handleFreshAuthResponse(response, data, teamAdminCurrentPath(teamId))) return; return alert(data.message || "サブ管理者から外せませんでした。"); }
    renderTeamDashboard(teamId, { message: "サブ管理者を更新しました。" });
  }));
  document.querySelectorAll("[data-revoke-invite]").forEach((button) => button.addEventListener("click", async () => {
    if (!confirm("この招待を取り消しますか？")) return;
    const { response, data } = await requestJson(`/api/team-admin/admins/invites/${encodeURIComponent(button.dataset.revokeInvite)}?teamId=${encodeURIComponent(teamId)}`, { method: "DELETE" });
    if (!response.ok) return alert(data.message || "招待を取り消せませんでした。");
    renderTeamDashboard(teamId, { message: "招待を取り消しました。" });
  }));
  document.querySelector("#copy-player-url")?.addEventListener("click", () => copyText(playerUrl, document.querySelector("#copy-player-status")));
  document.querySelector("#share-player-native")?.addEventListener("click", () => shareTeamPage(team.name, playerUrl, document.querySelector("#copy-player-status")));
  document.querySelector("#share-player-line")?.addEventListener("click", () => shareTeamOnLine(team.name, playerUrl));
  document.querySelector("#open-team-settings")?.addEventListener("click", () => openTeamSettingsModal(teamId, team, auth));
  document.querySelector("#open-team-withdraw")?.addEventListener("click", () => openTeamWithdrawModal(teamId, team, auth));
  document.querySelector("#open-add-group")?.addEventListener("click", () => openGroupModal(teamId));
  document.querySelector("#open-add-group-empty")?.addEventListener("click", () => openGroupModal(teamId));
  document.querySelectorAll("[data-edit-group]").forEach((button) => button.addEventListener("click", () => { const group = groups.find((item) => String(item.id) === String(button.dataset.editGroup)); if (group) openGroupModal(teamId, group); }));
  document.querySelectorAll("[data-preview-group-video]").forEach((button) => button.addEventListener("click", () => openVideoPreview(button.dataset.previewGroupVideo, `${button.dataset.groupTitle} / 説明動画`)));
  const groupSearch = document.querySelector<HTMLInputElement>("#group-search");
  groupSearch?.addEventListener("input", () => {
    const query = groupSearch.value.trim().toLocaleLowerCase("ja-JP");
    const cards = [...document.querySelectorAll<HTMLElement>("[data-group-search-text]")];
    cards.forEach((card) => {
      const matched = !query || String(card.dataset.groupSearchText || "").includes(query);
      card.dataset.filteredOut = matched ? "false" : "true";
    });
    groupSearch.closest(".admin-card")?.querySelector<HTMLElement>("[data-paged-collection]")?.dispatchEvent(new CustomEvent("admin:filter-change"));
  });
  document.querySelector<HTMLSelectElement>("#sign-group-filter")?.addEventListener("change", (event) => {
    const value = (event.currentTarget as HTMLSelectElement).value;
    const url = new URL(location.href);
    if (value && value !== "all") url.searchParams.set("groupId", value); else url.searchParams.delete("groupId");
    history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
    renderTeamDashboard(teamId, { view: "signs" });
  });
  const signSearch = document.querySelector<HTMLInputElement>("#sign-search");
  signSearch?.addEventListener("input", () => {
    const query = signSearch.value.trim().toLocaleLowerCase("ja-JP");
    const cards = [...document.querySelectorAll<HTMLElement>("[data-sign-search-text]")];
    let matches = 0;
    cards.forEach((card) => {
      const matched = !query || String(card.dataset.signSearchText || "").toLocaleLowerCase("ja-JP").includes(query);
      card.dataset.filteredOut = matched ? "false" : "true";
      if (matched) matches += 1;
    });
    const count = document.querySelector<HTMLElement>("#sign-visible-count");
    if (count) count.textContent = String(matches);
    document.querySelector<HTMLElement>("[data-paged-collection]")?.dispatchEvent(new CustomEvent("admin:filter-change"));
  });
  document.querySelector<HTMLElement>("#open-add-sign")?.addEventListener("click", (event) => {
    const defaultGroupId = (event.currentTarget as HTMLElement).dataset.defaultGroupId || null;
    openSignModal(teamId, groups, null, defaultGroupId);
  });
  document.querySelectorAll<HTMLButtonElement>("[data-move-sign]").forEach((button) => button.addEventListener("click", async () => {
    if (button.disabled) return;
    const signId = String(button.dataset.moveSign || "");
    const direction = button.dataset.moveDirection === "up" ? -1 : 1;
    const selectedKey = selectedSignGroupKey(groups, signs);
    const ordered = (selectedKey === "all" ? signs : selectedKey === "ungrouped" ? signs.filter((item) => !item.groupId) : signs.filter((item) => String(item.groupId) === selectedKey))
      .slice().sort((a, b) => Number(a.sortOrder || 0) - Number(b.sortOrder || 0) || Number(a.dbId) - Number(b.dbId));
    const currentIndex = ordered.findIndex((item) => String(item.dbId) === signId);
    const targetIndex = currentIndex + direction;
    if (currentIndex < 0 || targetIndex < 0 || targetIndex >= ordered.length) return;
    const current = ordered[currentIndex];
    const target = ordered[targetIndex];
    button.disabled = true;
    const currentOrder = Number(current.sortOrder || 0);
    const targetOrder = Number(target.sortOrder || 0);
    const fallbackCurrentOrder = currentIndex * 10 + 10;
    const fallbackTargetOrder = targetIndex * 10 + 10;
    const first = await requestJson(`/api/team-admin/signs/${encodeURIComponent(current.dbId)}`, { method: "PUT", body: JSON.stringify({ teamId, sortOrder: Number.isFinite(targetOrder) ? targetOrder : fallbackTargetOrder }) });
    if (!first.response.ok) { button.disabled = false; return alert(first.data.message || "並び順を変更できませんでした。"); }
    const second = await requestJson(`/api/team-admin/signs/${encodeURIComponent(target.dbId)}`, { method: "PUT", body: JSON.stringify({ teamId, sortOrder: Number.isFinite(currentOrder) ? currentOrder : fallbackCurrentOrder }) });
    if (!second.response.ok) {
      await requestJson(`/api/team-admin/signs/${encodeURIComponent(current.dbId)}`, { method: "PUT", body: JSON.stringify({ teamId, sortOrder: Number.isFinite(currentOrder) ? currentOrder : fallbackCurrentOrder }) }).catch(() => null);
      button.disabled = false;
      return alert(second.data.message || "並び順を変更できませんでした。");
    }
    renderTeamDashboard(teamId, { message: `「${current.name}」の並び順を変更しました。`, view: "signs" });
  }));
  document.querySelectorAll("[data-edit-sign]").forEach((button) => button.addEventListener("click", () => { const sign = signs.find((item) => String(item.dbId) === String(button.dataset.editSign)); if (sign) openSignModal(teamId, groups, sign); }));
  document.querySelectorAll("[data-add-video]").forEach((button) => button.addEventListener("click", () => { const sign = signs.find((item) => String(item.dbId) === String(button.dataset.addVideo)); if (sign) openVideoModal(teamId, sign, null, entitlements); }));
  document.querySelectorAll("[data-edit-video]").forEach((button) => button.addEventListener("click", () => { const sign = signs.find((item) => String(item.dbId) === String(button.dataset.signId)); const video = sign?.videoItems?.find((item) => String(item.id) === String(button.dataset.editVideo)); if (sign && video) openVideoModal(teamId, sign, video, entitlements); }));
  document.querySelectorAll("[data-preview-video]").forEach((button) => button.addEventListener("click", () => openVideoPreview(button.dataset.videoIdValue, button.dataset.videoTitle, Number(button.dataset.videoStart || 0))));
}
