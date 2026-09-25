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
      <a class="brand" href="/"><span class="brand-mark"><img class="brand-icon-img" src="${ICON}" alt="" width="128" height="128"></span><span class="brand-copy"><span class="brand-name">SIGN TRAINER</span><span class="brand-sub">管理画面</span></span></a>
      ${action}
    </div></header>
    <main class="admin-main">${body}</main>
  </div>`;
}

function notice(message, kind = "info") {
  return `<div class="admin-notice admin-notice--${esc(kind)}" role="status">${esc(message)}</div>`;
}

let adminModalKeyHandler = null;
let adminModalRestoreFocus = null;

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
export async function renderSystemAdmin({ initialView = "list" } = {}) {
  shell("システム管理", `<section class="admin-card admin-loading"><div class="spinner"></div><h1>システム管理を確認しています…</h1></section>`);
  const { response, data } = await requestJson("/api/system/session");
  if (!response.ok || !data.authenticated) {
    renderSystemLogin({ error: response.status === 503 ? (data.message || "サーバーの認証設定を確認してください。") : "", afterLogin: initialView });
    return;
  }
  if (initialView === "create") renderSystemDashboard({ view: "create" });
  else renderSystemDashboard({ view: "list" });
}

function renderSystemLogin({ error = "", afterLogin = "list" } = {}) {
  shell("システム管理ログイン", `<section class="admin-card admin-auth-card">
    <div class="admin-lock">🔐</div>
    <p class="admin-kicker">SYSTEM ADMIN</p>
    <h1>システム管理</h1>
    <p class="admin-lead">SIGN TRAINER全体のチームを管理します。</p>
    ${error ? notice(error, "error") : ""}
    <form id="system-login-form" class="admin-form">
      <label>システム管理者キー<input class="text-input" id="system-secret" type="password" autocomplete="current-password" required></label><p class="admin-help">12文字以上で、英字と数字を含む管理者キーを入力してください。</p>
      <button class="button button-primary button-full" type="submit">管理画面に入る</button>
    </form>
    <a class="button button-secondary button-full" href="/">トップページへ</a>
  </section>`);
  document.querySelector("#system-login-form")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const secret = document.querySelector("#system-secret").value;
    const submit = event.currentTarget.querySelector("button[type=submit]");
    submit.disabled = true;
    submit.textContent = "確認しています…";
    const { response, data } = await requestJson("/api/system/auth", { method: "POST", body: JSON.stringify({ secret }) });
    if (!response.ok) {
      renderSystemLogin({ error: data.message || "管理者キーを確認してください。", afterLogin });
      return;
    }
    renderSystemDashboard({ view: afterLogin });
  });
}

async function renderSystemDashboard({ view = "list", message = "" } = {}) {
  shell("システム管理", `<section class="admin-card admin-loading"><div class="spinner"></div><h1>チーム情報を読み込んでいます…</h1></section>`, `<button class="button button-ghost" id="system-logout" type="button">ログアウト</button>`);
  const { response, data } = await requestJson("/api/system/teams");
  if (response.status === 401) return renderSystemLogin({ afterLogin: view });
  if (!response.ok) {
    shell("システム管理", `<section class="admin-card"><h1>読み込めませんでした</h1>${notice(data.message || "D1の設定を確認してください。", "error")}<button class="button button-primary button-full" id="system-retry">再読み込み</button></section>`);
    document.querySelector("#system-retry")?.addEventListener("click", () => renderSystemDashboard({ view }));
    return;
  }
  const teams = data.teams || [];
  const active = teams.filter((t) => t.status === "active").length;
  const body = `<div class="admin-layout">
    <section class="admin-hero-card admin-hero-card--compact">
      <div><p class="admin-kicker">SYSTEM ADMIN</p><h1>チーム管理</h1><p>チームの状態を一覧で把握し、その場で登録・編集できます。</p></div>
      <button class="button button-primary" id="create-team-open" type="button">＋ チームを登録</button>
    </section>
    ${message ? notice(message, "success") : ""}
    <section class="admin-stats">
      <div><strong>${teams.length}</strong><span>登録チーム</span></div>
      <div><strong>${active}</strong><span>利用中</span></div>
      <div><strong>${teams.length - active}</strong><span>停止中</span></div>
      <div><strong>${teams.reduce((sum, t) => sum + Number(t.sign_count || 0), 0)}</strong><span>登録サイン</span></div>
    </section>
    <section class="admin-card">
      <div class="admin-section-heading admin-section-heading--actions"><div><p class="admin-kicker">DATA PROTECTION</p><h2>保存データの保護</h2><p class="admin-section-caption">既存のチーム名・個人情報・サイン名・グループ説明・動画情報をAES-256-GCMで暗号化します。OAuth識別子はHMAC検索キーへ移行します。</p></div><button class="button button-secondary" id="protect-data-now" type="button">既存データを保護</button></div>
      <div id="data-protection-status" class="admin-help">状態を確認しています…</div>
    </section>
    <section class="admin-card admin-card--flush-mobile">
      <div class="admin-section-heading"><div><p class="admin-kicker">TEAMS</p><h2>登録チーム</h2><p class="admin-section-caption">チーム名・利用状態・登録数を一覧で確認できます。</p></div></div>
      ${teams.length ? `<div class="admin-team-list">${teams.map(systemTeamCard).join("")}</div>` : `<div class="admin-empty"><strong>まだチームがありません</strong><p>「チームを登録」から作成してください。</p></div>`}
    </section>
  </div>`;
  shell("システム管理", body, `<button class="button button-ghost" id="system-logout" type="button">ログアウト</button>`);
  wireSystemDashboard(teams);
  if (view === "create") requestAnimationFrame(() => document.querySelector("#create-team-open")?.click());
}

function systemTeamCard(team) {
  const statusLabel = team.status === "active" ? "利用中" : "停止中";
  const plan = team.plan || { name: "Free", isFree: true };
  return `<article class="admin-team-card" data-team-id="${esc(team.id)}">
    <div class="admin-team-card-main">
      <div class="admin-team-title"><div class="admin-team-badges"><span class="admin-status admin-status--${esc(team.status)}">${statusLabel}</span><span class="admin-plan-mini">${esc(plan.name || "Free")}</span></div><h3>${esc(team.name)}</h3><p class="admin-id">${esc(team.id)}</p></div>
      <div class="admin-team-counts"><span><strong>${Number(team.sign_count || 0)}</strong><small>サイン</small></span><span><strong>${Number(team.video_count || 0)}</strong><small>動画</small></span></div>
    </div>
    <div class="admin-row-meta"><span>登録 ${esc(formatDate(team.created_at))}</span></div>
    <div class="admin-card-actions">
      <a class="button button-primary" href="/t/${encodeURIComponent(team.id)}/admin">管理画面</a>
      <button class="button button-secondary" data-system-edit="${esc(team.id)}" type="button">設定を編集</button>
      <button class="button button-ghost" data-system-status="${esc(team.id)}" data-next-status="${team.status === "active" ? "suspended" : "active"}" type="button">${team.status === "active" ? "利用停止" : "利用再開"}</button>
    </div>
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

function wireSystemDashboard(teams) {
  document.querySelector("#system-logout")?.addEventListener("click", async () => {
    await fetch("/api/system/logout", { method: "POST" });
    renderSystemLogin();
  });

  refreshDataProtectionStatus();
  document.querySelector("#protect-data-now")?.addEventListener("click", async (event) => {
    const button = event.currentTarget;
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

  document.querySelector("#create-team-open")?.addEventListener("click", () => {
    openAdminModal({
      title: "新しいチームを登録",
      kicker: "NEW TEAM",
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
          const submit = event.currentTarget.querySelector("button[type=submit]");
          const payload = Object.fromEntries(new FormData(event.currentTarget as HTMLFormElement).entries());
          if (!isValidAdminCredential(payload.adminPassword)) return modalError(adminCredentialMessage());
          setButtonBusy(submit, true, "登録しています…");
          const { response, data } = await requestJson("/api/system/teams", { method: "POST", body: JSON.stringify(payload) });
          if (!response.ok) { setButtonBusy(submit, false); return modalError(data.message || "登録できませんでした。"); }
          const playerUrl = teamUrl(data.team.id);
          const adminUrl = new URL(`/t/${encodeURIComponent(data.team.id)}/admin`, window.location.origin).href;
          const playerQr = await qrImageUrl(playerUrl, 280);
          layer.querySelector(".admin-modal-body").innerHTML = `<div class="admin-created-team"><div class="admin-success-mark">✓</div><h3>登録しました</h3><p><strong>${esc(data.team.name)}</strong></p><div class="admin-qr-wrap"><div class="admin-qr"><img src="${esc(playerQr)}" alt="${esc(data.team.name)}の参加QRコード" width="220" height="220"><span class="admin-qr-logo"><img src="${ICON}" alt=""></span></div></div><label>選手用URL<div class="admin-copy-row"><input class="text-input" readonly value="${esc(playerUrl)}"><button class="button button-secondary" data-copy="${esc(playerUrl)}" type="button">コピー</button></div></label><label>管理URL<div class="admin-copy-row"><input class="text-input" readonly value="${esc(adminUrl)}"><button class="button button-secondary" data-copy="${esc(adminUrl)}" type="button">コピー</button></div></label><button class="button button-primary button-full" id="create-finish" type="button">完了</button></div>`;
          layer.querySelectorAll("[data-copy]").forEach((button) => button.addEventListener("click", () => copyText(button.dataset.copy, button)));
          layer.querySelector("#create-finish")?.addEventListener("click", () => { closeAdminModal(); renderSystemDashboard({ message: "チームを登録しました。" }); });
        });
      }
    });
  });

  document.querySelectorAll("[data-system-edit]").forEach((button) => button.addEventListener("click", () => {
    const team = teams.find((t) => String(t.id) === String(button.dataset.systemEdit));
    if (!team) return;
    openAdminModal({
      title: team.name,
      kicker: "TEAM SETTINGS",
      body: `<div id="admin-modal-error"></div><form id="system-team-edit-form" class="admin-form">
        <label>チーム名<input class="text-input" name="name" type="text" maxlength="80" value="${esc(team.name)}" required></label>
        <label>選手用合言葉を変更 <span class="admin-optional">変更時のみ</span><input class="text-input" name="passphrase" type="text" autocomplete="off"></label>
        <label>管理者パスワードを変更 <span class="admin-optional">変更時のみ・12文字以上＋英字＋数字</span><input class="text-input" name="adminPassword" type="password" minlength="12" autocomplete="new-password"></label>
        <div class="admin-modal-actions"><button class="button button-primary" type="submit">保存する</button><button class="button button-danger" id="system-team-delete" type="button">チームを無効化</button></div>
      </form>`,
      onOpen(layer) {
        layer.querySelector("#system-team-edit-form")?.addEventListener("submit", async (event) => {
          event.preventDefault();
          const submit = event.currentTarget.querySelector("button[type=submit]");
          const values = Object.fromEntries(new FormData(event.currentTarget as HTMLFormElement).entries());
          if (values.adminPassword && !isValidAdminCredential(values.adminPassword)) return modalError(adminCredentialMessage());
          setButtonBusy(submit, true);
          const { response, data } = await requestJson(`/api/system/teams/${encodeURIComponent(team.id)}`, { method: "PUT", body: JSON.stringify(values) });
          if (!response.ok) { setButtonBusy(submit, false); return modalError(data.message || "保存できませんでした。"); }
          closeAdminModal(); renderSystemDashboard({ message: "チーム設定を保存しました。" });
        });
        layer.querySelector("#system-team-delete")?.addEventListener("click", async () => {
          if (!confirm(`「${team.name}」を無効化しますか？`)) return;
          const { response, data } = await requestJson(`/api/system/teams/${encodeURIComponent(team.id)}`, { method: "DELETE" });
          if (!response.ok) return modalError(data.message || "無効化できませんでした。");
          closeAdminModal(); renderSystemDashboard({ message: "チームを無効化しました。" });
        });
      }
    });
  }));

  document.querySelectorAll("[data-system-status]").forEach((button) => button.addEventListener("click", async () => {
    const teamId = button.dataset.systemStatus;
    const status = button.dataset.nextStatus;
    if (!confirm(status === "suspended" ? "このチームを利用停止にしますか？" : "このチームの利用を再開しますか？")) return;
    const { response, data } = await requestJson(`/api/system/teams/${encodeURIComponent(teamId)}`, { method: "PUT", body: JSON.stringify({ status }) });
    if (!response.ok) return alert(data.message || "更新できませんでした。");
    renderSystemDashboard({ message: status === "active" ? "利用を再開しました。" : "利用を停止しました。" });
  }));
}

// ---------------- Team admin ----------------
export async function renderTeamAdmin(teamId) {
  shell("チーム管理", `<section class="admin-card admin-loading"><div class="spinner"></div><h1>チーム管理を確認しています…</h1></section>`);
  const { response, data } = await requestJson(`/api/team-admin/session?teamId=${encodeURIComponent(teamId)}`);
  if (response.status === 404) return renderTeamAdminNotFound();
  if (!response.ok || !data.authenticated) return renderTeamAdminLogin(teamId, {
    teamName: data.teamName || "",
    error: response.status === 503 ? (data.message || "サーバーの認証設定を確認してください。") : "",
    accountManaged: Boolean(data.accountManaged),
    legacyPasswordEnabled: data.legacyPasswordEnabled !== false
  });
  renderTeamDashboard(teamId);
}

function renderTeamAdminNotFound() {
  shell("チームが見つかりません", `<section class="admin-card admin-auth-card"><h1>チームが見つかりません</h1><p>管理URLを確認してください。</p><a class="button button-primary button-full" href="/">トップページへ</a></section>`);
}

function renderTeamAdminLogin(teamId, { teamName = "", error = "", accountManaged = false, legacyPasswordEnabled = true } = {}) {
  const returnTo = `/t/${teamId}/admin`;
  const oauth = accountManaged ? `<div class="admin-account-login"><p class="admin-kicker">ACCOUNT LOGIN</p><h2>管理者アカウントでログイン</h2><p class="admin-help">登録済みのGoogle / LINEアカウントを使います。</p>${adminOAuthButtons({ intent: "login", returnTo })}<p class="admin-help">続けることで、<a href="/terms" target="_blank" rel="noopener">利用規約</a>と<a href="/privacy" target="_blank" rel="noopener">プライバシーポリシー</a>を確認し同意したものとして扱います。</p></div>` : "";
  const passwordForm = legacyPasswordEnabled ? `<form id="team-admin-login-form" class="admin-form">
      <label>管理者パスワード<input class="text-input" id="team-admin-password" type="password" autocomplete="current-password" required></label>
      <p class="admin-help">${accountManaged ? "以前の共有パスワードでもログインできます。安全性のため、アカウント移行後は無効化を推奨します。" : "ログイン後にGoogle / LINEアカウントへ移行できます。"}</p>
      <button class="button button-primary button-full" type="submit">管理者パスワードで入る</button>
    </form>` : "";
  shell("チーム管理ログイン", `<section class="admin-card admin-auth-card">
    <div class="admin-lock">⚾</div><p class="admin-kicker">TEAM ADMIN</p><h1>チーム管理</h1><p class="admin-lead">${teamName ? esc(teamName) : "サイン・動画を管理します"}</p>
    ${error ? notice(error, "error") : ""}
    ${oauth}${accountManaged && legacyPasswordEnabled ? `<div class="admin-auth-divider"><span>または</span></div>` : ""}${passwordForm}
    ${!accountManaged && !legacyPasswordEnabled ? notice("このチームの管理者アカウント設定を確認してください。", "error") : ""}
    <a class="button button-secondary button-full" href="/t/${encodeURIComponent(teamId)}">選手用ページへ</a>
  </section>`);
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
      <div class="admin-migration-callout"><div><p class="admin-kicker">ADMIN ACCOUNT</p><h2>管理者アカウントへ移行</h2><p>現在は共有パスワードで管理しています。Google / LINEを連携すると、管理者の追加・交代・退会をアカウント単位で安全に行えます。移行完了時に旧共有パスワードは自動で無効化され、既存のサインや動画はそのままです。</p></div>${adminOAuthButtons({ intent: "claim-team", teamId, returnTo: `/t/${teamId}/admin` })}<p class="admin-help">移行を続けることで、<a href="/terms" target="_blank" rel="noopener">利用規約</a>と<a href="/privacy" target="_blank" rel="noopener">プライバシーポリシー</a>を確認し同意したものとして扱います。</p></div>
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
    <div class="admin-identity-header"><div><p class="admin-kicker">ADMINISTRATORS</p><h2>管理者と権限</h2><p class="admin-section-caption">メイン管理者は1名、サブ管理者は最大${maxSubAdmins}名。管理者ごとにGoogle / LINEで本人認証します。</p></div><a class="button button-secondary" href="/account">マイアカウント</a></div>
    <div class="admin-admin-capacity"><strong>サブ管理者 ${admins.length} / ${maxSubAdmins}</strong><span>${pendingSubAdminInvites ? `承認待ち ${pendingSubAdminInvites}名 · ` : ""}追加可能 ${subAdminSlotsRemaining}名</span></div>
    <div class="admin-identity-list">${memberRows}</div>
    ${pending ? `<div class="admin-section-subtitle"><strong>承認待ちの招待</strong></div><div class="admin-identity-list">${pending}</div>` : ""}
    <div class="admin-identity-actions">${owner ? `<button class="button button-primary" id="open-admin-invite" type="button" ${canInviteSubAdmin ? "" : "disabled"}>＋ サブ管理者を招待</button><button class="button button-secondary" id="open-owner-transfer" type="button">メイン管理者を交代</button>${management.legacyPasswordEnabled ? `<button class="button button-ghost" id="disable-legacy-password" type="button">旧パスワードを無効化</button>` : `<span class="admin-status admin-status--active">共有パスワード無効</span>`}` : `<button class="button button-danger" id="leave-team-admin" type="button">このチームのサブ管理者を退会</button>`}</div>
    ${owner && !canInviteSubAdmin ? `<p class="admin-help">サブ管理者は最大${maxSubAdmins}名です。承認待ちの招待を取り消すか、既存のサブ管理者を外すと新しく招待できます。</p>` : ""}
    ${owner && management.legacyPasswordEnabled ? `<p class="admin-help">アカウント移行が確認できたら旧管理者パスワードを無効化すると、共有パスワードを知る人からのアクセスを止められます。</p>` : ""}
  </section>`;
}

function showInviteResult(teamId, invite, label) {
  openAdminModal({
    title: label,
    kicker: "ONE-TIME INVITE",
    body: `<div class="admin-invite-result"><strong>このリンクを交代・追加する管理者本人へ送ってください</strong><div class="admin-copy-row"><input class="text-input" id="generated-invite-url" readonly value="${esc(invite.url)}"><button class="button button-primary" id="copy-generated-invite" type="button">コピー</button></div><p class="admin-help" id="invite-copy-status" aria-live="polite"></p><button class="button line-share-button button-full" id="line-generated-invite" type="button">LINEで送る</button><p class="admin-security-note">このリンクは一度だけ使用でき、最長72時間で期限切れになります。SNSなど公開場所には貼らないでください。</p></div><button class="button button-secondary button-full" id="invite-result-close" type="button">閉じる</button>`,
    onOpen(layer) {
      layer.querySelector("#copy-generated-invite")?.addEventListener("click", () => copyText(invite.url, layer.querySelector("#invite-copy-status")));
      layer.querySelector("#line-generated-invite")?.addEventListener("click", () => window.open(`https://line.me/R/share?text=${encodeURIComponent(`【SIGN TRAINER】\n${label}の招待です。\n${invite.url}`)}`, "_blank", "noopener,noreferrer"));
      layer.querySelector("#invite-result-close")?.addEventListener("click", closeAdminModal);
    }
  });
}

function openAdminInviteModal(teamId) {
  openAdminModal({
    title: "サブ管理者を招待",
    kicker: "ADMIN INVITE",
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
    kicker: "OWNER TRANSFER",
    body: `<div id="admin-modal-error"></div><div class="notice notice-warning"><strong>重要な操作です</strong><br>交代が完了すると旧共有パスワードは自動的に無効化されます。</div><form id="owner-transfer-form" class="admin-form">${admins.length ? `<label>交代方法<select class="text-input" name="nextOwnerUserId"><option value="">新しい人へ交代リンクを発行</option>${admins.map((member) => `<option value="${esc(member.userId)}">登録済みサブ管理者：${esc(member.displayName)}</option>`).join("")}</select></label>` : `<p class="admin-help">登録済みのサブ管理者がいないため、新しいメイン管理者へ交代リンクを発行します。</p>`}<label class="admin-toggle admin-toggle--panel"><input type="checkbox" name="currentOwnerExit"><span>交代後、自分はこのチームの管理者から外れる</span></label><label>リンクの有効時間 <span class="admin-optional">新しい人へ発行する場合</span><select class="text-input" name="expiresHours"><option value="24">24時間</option><option value="48">48時間</option><option value="72">72時間</option></select></label><button class="button button-primary button-full" type="submit">交代手続きを進める</button></form>`,
    onOpen(layer) {
      layer.querySelector("#owner-transfer-form")?.addEventListener("submit", async (event) => {
        event.preventDefault(); const fd = new FormData(event.currentTarget as HTMLFormElement); const submit = event.currentTarget.querySelector("button[type=submit]"); const nextOwnerUserId = String(fd.get("nextOwnerUserId") || ""); const currentOwnerExit = fd.get("currentOwnerExit") === "on"; setButtonBusy(submit, true, "処理しています…");
        if (nextOwnerUserId) {
          if (!confirm("選択したサブ管理者へメイン管理者権限を移します。続けますか？")) { setButtonBusy(submit, false); return; }
          const { response, data } = await requestJson("/api/team-admin/admins/transfer", { method: "POST", body: JSON.stringify({ teamId, nextOwnerUserId, currentOwnerExit }) });
          if (!response.ok) { setButtonBusy(submit, false); if (handleFreshAuthResponse(response, data, `/t/${teamId}/admin`)) return; return modalError(data.message || "交代できませんでした。"); }
          closeAdminModal(); return renderTeamDashboard(teamId, { message: "メイン管理者を交代しました。" });
        }
        const { response, data } = await requestJson("/api/team-admin/admins/invites", { method: "POST", body: JSON.stringify({ teamId, kind: "transfer", currentOwnerExit, expiresHours: Number(fd.get("expiresHours")) }) });
        if (!response.ok) { setButtonBusy(submit, false); if (handleFreshAuthResponse(response, data, `/t/${teamId}/admin`)) return; return modalError(data.message || "交代リンクを発行できませんでした。"); }
        closeAdminModal(); showInviteResult(teamId, data.invite, "メイン管理者交代");
      });
    }
  });
}

async function renderTeamDashboard(teamId, { message = "" } = {}) {
  shell("チーム管理", `<section class="admin-card admin-loading"><div class="spinner"></div><h1>サイン情報を読み込んでいます…</h1></section>`, `<button class="button button-ghost" id="team-admin-logout" type="button">ログアウト</button>`);
  const { response, data } = await requestJson(`/api/team-admin/team?teamId=${encodeURIComponent(teamId)}`);
  if (response.status === 401) return renderTeamAdmin(teamId);
  if (!response.ok) return shell("チーム管理", `<section class="admin-card"><h1>読み込めませんでした</h1>${notice(data.message || "もう一度お試しください。", "error")}</section>`);
  const team = data.team;
  const signs = data.signs || [];
  const groups = data.groups || [];
  const auth = data.auth || {};
  const adminManagement = data.adminManagement || null;
  const planState = data.plan || {};
  const plan = planState.plan || { code: "free", name: "Free", isFree: true, availableForPurchase: false };
  const playerUrl = teamUrl(teamId);
  const qrSrc = await qrImageUrl(playerUrl, 320);
  const totalVideos = signs.reduce((sum, sign) => sum + (sign.videoItems || []).length, 0);
  const enabledSigns = signs.filter((sign) => sign.enabled).length;
  const enabledGroups = groups.filter((group) => group.enabled).length;
  const body = `<div class="admin-layout">
    <section class="admin-hero-card admin-hero-card--compact">
      <div><p class="admin-kicker">TEAM ADMIN</p><h1>${esc(team.name)}</h1><p>一覧で状況を確認し、編集はその場のダイアログで完結します。</p></div>
      <div class="admin-hero-actions"><a class="button button-secondary" href="/t/${encodeURIComponent(teamId)}">選手用ページ</a><button class="button button-primary" id="open-team-settings" type="button">チーム設定</button></div>
    </section>
    ${message ? notice(message, "success") : ""}
    <section class="admin-stats admin-stats--three">
      <div><strong>${groups.length}</strong><span>グループ</span></div>
      <div><strong>${enabledSigns}</strong><span>練習サイン</span></div>
      <div><strong>${totalVideos}</strong><span>登録動画</span></div>
    </section>
    <section class="admin-plan-card">
      <div><p class="admin-kicker">PLAN</p><div class="admin-plan-title"><h2>${esc(plan.name || "Free")}</h2><span class="admin-plan-price">${plan.isFree ? "¥0" : "契約中"}</span></div><p>現在のサイン登録・グループ・YouTube動画・クイズ・共有・PWAはこのプランで利用できます。</p></div>
      <div class="admin-plan-future"><strong>クラウド保存は将来の追加機能</strong><span>画像・動画をSIGN TRAINERへ直接保存する機能は、保存コストに応じた別プランとして提供予定です。現在は課金されません。</span></div>
    </section>
    ${adminIdentitySection(teamId, team, auth, adminManagement)}
    <section class="admin-card admin-share-card">
      <div class="admin-section-heading"><div><p class="admin-kicker">SHARE</p><h2>チームメンバーに共有</h2><p class="admin-section-caption">参加リンクとQRコードをいつでも確認できます。</p></div></div>
      <div class="admin-share-grid">
        <div class="admin-share-content">
          <label>メンバー用URL<div class="admin-copy-row"><input class="text-input" id="team-player-url" readonly value="${esc(playerUrl)}"><button class="button button-primary" id="copy-player-url" type="button">コピー</button></div></label>
          <div class="admin-share-actions"><button class="button line-share-button" id="share-player-line" type="button">LINEで共有</button><button class="button button-secondary" id="share-player-native" type="button">その他で共有</button></div>
          <p class="admin-help" id="copy-player-status">合言葉はURL・QRには含まれません。</p>
        </div>
        <div class="admin-qr-wrap"><div class="admin-qr"><img src="${esc(qrSrc)}" alt="${esc(team.name)}の選手用ページQRコード" width="220" height="220"><span class="admin-qr-logo"><img src="${ICON}" alt=""></span></div><p>現在の環境URLから動的生成</p></div>
      </div>
    </section>
    <section class="admin-card admin-card--flush-mobile">
      <div class="admin-section-heading admin-section-heading--actions"><div><p class="admin-kicker">GROUPS</p><h2>サイングループ <span class="admin-count-badge">${groups.length}</span></h2><p class="admin-section-caption">グループごとの説明と説明動画を管理します。日付との紐付けはせず、選手が練習前に使うグループを選びます。</p></div><button class="button button-primary" id="open-add-group" type="button">＋ グループを追加</button></div>
      <div class="admin-group-list">${groups.length ? groups.map((group) => teamGroupCard(group, signs)).join("") : `<div class="admin-empty"><strong>グループはまだありません</strong><p>「グループを追加」から、例：Aサイン / Bサイン のように作成できます。</p></div>`}</div>
    </section>
    <section class="admin-card admin-card--flush-mobile">
      <div class="admin-section-heading admin-section-heading--actions"><div><p class="admin-kicker">SIGNS</p><h2>サイン一覧 <span class="admin-count-badge">${signs.length}</span></h2><p class="admin-section-caption">サイン名・状態・動画数・動画の用途を一覧で把握できます。</p></div><button class="button button-primary" id="open-add-sign" type="button">＋ サインを追加</button></div>
      <div class="admin-sign-list admin-sign-list--overview">${signs.length ? signs.map((sign, index) => teamSignCard(sign, index, groups)).join("") : `<div class="admin-empty"><strong>サインがまだありません</strong><p>「サインを追加」から最初のサインを登録してください。</p></div>`}</div>
    </section>
  </div>`;
  shell("チーム管理", body, `<button class="button button-ghost" id="team-admin-logout" type="button">ログアウト</button>`);
  wireTeamDashboard(teamId, team, groups, signs, playerUrl, auth, adminManagement);
}

function teamGroupCard(group, signs) {
  const members = signs.filter((sign) => Number(sign.groupId) === Number(group.id));
  const hasVideo = Boolean(group.videoId);
  return `<article class="admin-group-card" data-group-id="${Number(group.id)}">
    <div class="admin-group-card-main"><div><div class="admin-group-title-row"><h3>${esc(group.name)}</h3><span class="admin-status ${group.enabled ? "admin-status--active" : "admin-status--suspended"}">${group.enabled ? "使用中" : "停止中"}</span></div><p>${group.description ? esc(group.description) : "説明文は未登録です。"}</p><div class="admin-group-meta"><span>${members.length}サイン</span><span>${hasVideo ? "説明動画あり" : "説明動画なし"}</span></div></div></div>
    <div class="admin-group-actions">${hasVideo ? `<button class="button button-secondary" data-preview-group-video="${esc(group.videoId)}" data-group-title="${esc(group.name)}" type="button">説明動画を確認</button>` : ""}<button class="button button-ghost" data-edit-group="${Number(group.id)}" type="button">編集</button></div>
  </article>`;
}

function teamSignCard(sign, index, groups = []) {
  const videos = sign.videoItems || [];
  const enabledVideos = videos.filter((video) => video.enabled).length;
  const group = groups.find((item) => Number(item.id) === Number(sign.groupId));
  return `<article class="admin-sign-card admin-sign-card--summary" data-sign-id="${Number(sign.dbId)}">
    <div class="admin-sign-summary-head"><div class="admin-sign-index">${index + 1}</div><div class="admin-sign-summary-title"><div class="admin-sign-title-line"><h3>${esc(sign.name)}</h3><span class="admin-status ${sign.enabled ? "admin-status--active" : "admin-status--suspended"}">${sign.enabled ? "使用中" : "停止中"}</span></div><p>${group ? `${esc(group.name)} · ` : "未分類 · "}${videos.length}動画 / ${enabledVideos}動画を出題対象</p></div><button class="button button-secondary admin-edit-sign" data-edit-sign="${Number(sign.dbId)}" type="button">編集</button></div>
    <div class="admin-video-list admin-video-list--summary">${videos.length ? videos.map((video, vIndex) => teamVideoRow(sign, video, vIndex)).join("") : `<div class="admin-empty admin-empty--compact"><strong>動画未登録</strong><p>このサインはまだ出題できません。</p></div>`}</div>
    <div class="admin-sign-footer"><button class="button button-secondary" data-add-video="${Number(sign.dbId)}" type="button">＋ 動画を追加</button></div>
  </article>`;
}

function teamVideoRow(sign, video, index) {
  const comment = String(video.comment || "").trim();
  return `<div class="admin-video-row admin-video-row--summary" data-video-id="${Number(video.id)}">
    <button class="admin-video-preview-thumb" data-preview-video="${Number(video.id)}" data-video-id-value="${esc(video.videoId)}" data-video-title="${esc(`${sign.name} / 動画${index + 1}`)}" type="button" aria-label="動画をプレビュー"><span class="admin-video-play">▶</span><span>動画${index + 1}</span></button>
    <div class="admin-video-summary-copy"><div class="admin-video-summary-top"><strong>${comment ? esc(comment) : `動画${index + 1}`}</strong><span class="admin-status ${video.enabled ? "admin-status--active" : "admin-status--suspended"}">${video.enabled ? "有効" : "無効"}</span></div><p class="admin-video-id">YouTube: ${esc(video.videoId)}</p>${comment ? `<p class="admin-video-comment">${esc(comment)}</p>` : `<p class="admin-video-comment admin-video-comment--empty">用途メモなし</p>`}</div>
    <div class="admin-video-summary-actions"><button class="button button-secondary" data-preview-video="${Number(video.id)}" data-video-id-value="${esc(video.videoId)}" data-video-title="${esc(`${sign.name} / ${comment || `動画${index + 1}`}`)}" type="button">確認</button><button class="button button-ghost" data-edit-video="${Number(video.id)}" data-sign-id="${Number(sign.dbId)}" type="button">編集</button></div>
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

function openGroupModal(teamId, group = null) {
  const editing = Boolean(group);
  openAdminModal({
    title: editing ? "グループを編集" : "グループを追加",
    kicker: "SIGN GROUP",
    body: `<div id="admin-modal-error"></div><form id="group-modal-form" class="admin-form"><label>グループ名<input class="text-input" name="name" maxlength="80" value="${esc(group?.name || "")}" placeholder="例：Aサイン" required></label><label>グループの説明<textarea class="text-input admin-textarea" name="description" maxlength="1200" placeholder="例：攻撃時に使う基本サイン。帽子→胸の順番を意識します。">${esc(group?.description || "")}</textarea></label><label>説明用YouTube URL <span class="admin-optional">任意</span><input class="text-input" name="youtubeUrl" type="url" inputmode="url" value="${esc(group?.youtubeUrl || "")}" placeholder="https://youtube.com/..."></label>${editing ? `<label>並び順<input class="text-input" name="sortOrder" type="number" value="${Number(group.sortOrder || 0)}"></label><label class="admin-toggle admin-toggle--panel"><input name="enabled" type="checkbox" ${group.enabled ? "checked" : ""}><span>選手画面で使用する</span></label>` : ""}<div class="admin-modal-actions"><button class="button button-primary" type="submit">${editing ? "保存する" : "追加する"}</button>${editing ? `<button class="button button-danger" id="delete-group-in-modal" type="button">グループを削除</button>` : ""}</div></form>`,
    onOpen(layer) {
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

function openSignModal(teamId, groups, sign = null) {
  const editing = Boolean(sign);
  openAdminModal({
    title: editing ? "サインを編集" : "サインを追加",
    kicker: "SIGN",
    body: `<div id="admin-modal-error"></div><form id="sign-modal-form" class="admin-form"><label>サイン名<input class="text-input" name="name" type="text" maxlength="80" value="${esc(sign?.name || "")}" placeholder="例：ヒットエンドラン" required></label><label>サイングループ<select class="text-input" name="groupId"><option value="">未分類</option>${groups.map((g) => `<option value="${Number(g.id)}" ${Number(sign?.groupId) === Number(g.id) ? "selected" : ""}>${esc(g.name)}</option>`).join("")}</select></label>${editing ? `<label>並び順<input class="text-input" name="sortOrder" type="number" value="${Number(sign.sortOrder || 0)}"></label><label class="admin-toggle admin-toggle--panel"><input name="enabled" type="checkbox" ${sign.enabled ? "checked" : ""}><span>練習で使用する</span></label>` : `<label>最初のYouTube URL <span class="admin-optional">あとからでも追加できます</span><input class="text-input" name="youtubeUrl" type="url" inputmode="url" placeholder="https://youtube.com/shorts/..."></label><label>動画コメント <span class="admin-optional">任意</span><textarea class="text-input admin-textarea" name="videoComment" maxlength="300" placeholder="例：監督の正面から撮影。試合前の確認用"></textarea></label>`}<div class="admin-modal-actions"><button class="button button-primary" type="submit">${editing ? "保存する" : "追加する"}</button>${editing ? `<button class="button button-danger" id="delete-sign-in-modal" type="button">サインを削除</button>` : ""}</div></form>`,
    onOpen(layer) {
      layer.querySelector("#sign-modal-form")?.addEventListener("submit", async (event) => {
        event.preventDefault(); const fd = new FormData(event.currentTarget as HTMLFormElement); const submit = event.currentTarget.querySelector("button[type=submit]"); setButtonBusy(submit, true);
        const payload = editing ? { teamId, name: fd.get("name"), groupId: fd.get("groupId") || null, sortOrder: Number(fd.get("sortOrder")), enabled: fd.get("enabled") === "on" } : { teamId, name: fd.get("name"), groupId: fd.get("groupId") || null, youtubeUrl: fd.get("youtubeUrl"), videoComment: fd.get("videoComment") };
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

function openVideoModal(teamId, sign, video = null) {
  const editing = Boolean(video);
  openAdminModal({
    title: editing ? "動画を編集" : "動画を追加",
    kicker: sign.name,
    body: `<div id="admin-modal-error"></div><form id="video-modal-form" class="admin-form"><label>YouTube URL<input class="text-input" name="youtubeUrl" type="url" inputmode="url" value="${esc(video?.youtubeUrl || "")}" placeholder="https://youtube.com/shorts/..." required></label><label>この動画の用途・補足 <span class="admin-optional">任意</span><textarea class="text-input admin-textarea" name="comment" maxlength="300" placeholder="例：横から撮影。帽子→胸の動きを確認しやすい">${esc(video?.comment || "")}</textarea></label>${editing ? `<label>並び順<input class="text-input" name="sortOrder" type="number" value="${Number(video.sortOrder || 0)}"></label><label class="admin-toggle admin-toggle--panel"><input name="enabled" type="checkbox" ${video.enabled ? "checked" : ""}><span>この動画を出題に使う</span></label>` : ""}<div class="admin-modal-actions"><button class="button button-primary" type="submit">${editing ? "保存する" : "動画を追加"}</button>${editing ? `<button class="button button-danger" id="delete-video-in-modal" type="button">動画を削除</button>` : ""}</div></form>`,
    onOpen(layer) {
      layer.querySelector("#video-modal-form")?.addEventListener("submit", async (event) => {
        event.preventDefault(); const fd = new FormData(event.currentTarget as HTMLFormElement); const submit = event.currentTarget.querySelector("button[type=submit]"); setButtonBusy(submit, true);
        const payload = editing ? { teamId, youtubeUrl: fd.get("youtubeUrl"), comment: fd.get("comment"), sortOrder: Number(fd.get("sortOrder")), enabled: fd.get("enabled") === "on" } : { teamId, youtubeUrl: fd.get("youtubeUrl"), comment: fd.get("comment") };
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

function openVideoPreview(videoId, title) {
  if (!/^[A-Za-z0-9_-]{11}$/.test(videoId || "")) return;
  const src = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoId)}?playsinline=1&rel=0&controls=1&fs=1`;
  openAdminModal({ title: title || "動画を確認", kicker: "YOUTUBE PREVIEW", wide: true, body: `<div class="admin-video-preview"><iframe src="${src}" title="${esc(title || "YouTube動画")}" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowfullscreen loading="eager"></iframe></div><p class="admin-help">管理画面内で内容を確認できます。閉じると再生も終了します。</p>` });
}

function wireTeamDashboard(teamId, team, groups, signs, playerUrl, auth = {}, adminManagement = null) {
  document.querySelector("#team-admin-logout")?.addEventListener("click", async () => { await fetch("/api/team-admin/logout", { method: "POST" }); renderTeamAdmin(teamId); });
  wireOAuthAvailability();
  document.querySelector("#open-admin-invite")?.addEventListener("click", () => openAdminInviteModal(teamId));
  document.querySelector("#open-owner-transfer")?.addEventListener("click", () => openOwnerTransferModal(teamId, adminManagement || { members: [] }));
  document.querySelector("#disable-legacy-password")?.addEventListener("click", async () => {
    if (!confirm("旧管理者パスワードでのログインを無効化します。Google / LINEアカウントでログインできることを確認済みですか？")) return;
    const { response, data } = await requestJson(`/api/team-admin/legacy-password/disable?teamId=${encodeURIComponent(teamId)}`, { method: "POST" });
    if (!response.ok) { if (handleFreshAuthResponse(response, data, `/t/${teamId}/admin`)) return; return alert(data.message || "無効化できませんでした。"); }
    renderTeamDashboard(teamId, { message: "旧管理者パスワードを無効化しました。" });
  });
  document.querySelector("#leave-team-admin")?.addEventListener("click", async () => {
    if (!confirm("このチームの管理者から退会しますか？以後、このチームの管理画面には入れません。")) return;
    const { response, data } = await requestJson(`/api/team-admin/membership?teamId=${encodeURIComponent(teamId)}`, { method: "DELETE" });
    if (!response.ok) { if (handleFreshAuthResponse(response, data, `/t/${teamId}/admin`)) return; return alert(data.message || "退会できませんでした。"); }
    location.href = "/account";
  });
  document.querySelectorAll("[data-remove-admin]").forEach((button) => button.addEventListener("click", async () => {
    if (!confirm("この人をサブ管理者から外しますか？")) return;
    const { response, data } = await requestJson(`/api/team-admin/admins/${encodeURIComponent(button.dataset.removeAdmin)}?teamId=${encodeURIComponent(teamId)}`, { method: "DELETE" });
    if (!response.ok) { if (handleFreshAuthResponse(response, data, `/t/${teamId}/admin`)) return; return alert(data.message || "サブ管理者から外せませんでした。"); }
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
  document.querySelector("#open-add-group")?.addEventListener("click", () => openGroupModal(teamId));
  document.querySelectorAll("[data-edit-group]").forEach((button) => button.addEventListener("click", () => { const group = groups.find((item) => String(item.id) === String(button.dataset.editGroup)); if (group) openGroupModal(teamId, group); }));
  document.querySelectorAll("[data-preview-group-video]").forEach((button) => button.addEventListener("click", () => openVideoPreview(button.dataset.previewGroupVideo, `${button.dataset.groupTitle} / 説明動画`)));
  document.querySelector("#open-add-sign")?.addEventListener("click", () => openSignModal(teamId, groups));
  document.querySelectorAll("[data-edit-sign]").forEach((button) => button.addEventListener("click", () => { const sign = signs.find((item) => String(item.dbId) === String(button.dataset.editSign)); if (sign) openSignModal(teamId, groups, sign); }));
  document.querySelectorAll("[data-add-video]").forEach((button) => button.addEventListener("click", () => { const sign = signs.find((item) => String(item.dbId) === String(button.dataset.addVideo)); if (sign) openVideoModal(teamId, sign); }));
  document.querySelectorAll("[data-edit-video]").forEach((button) => button.addEventListener("click", () => { const sign = signs.find((item) => String(item.dbId) === String(button.dataset.signId)); const video = sign?.videoItems?.find((item) => String(item.id) === String(button.dataset.editVideo)); if (sign && video) openVideoModal(teamId, sign, video); }));
  document.querySelectorAll("[data-preview-video]").forEach((button) => button.addEventListener("click", () => openVideoPreview(button.dataset.videoIdValue, button.dataset.videoTitle)));
}
