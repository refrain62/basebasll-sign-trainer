import { qrImageUrl, teamUrl } from "./share-utils.js?v=69";

const app = document.querySelector("#app");
const ICON = "/assets/sign-trainer-icon.png";

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

function closeAdminModal() {
  const modal = document.querySelector("#admin-modal-layer");
  if (!modal) return;
  modal.remove();
  document.body.classList.remove("admin-modal-open");
}

function openAdminModal({ title, kicker = "", body = "", wide = false, onOpen } = {}) {
  closeAdminModal();
  const layer = document.createElement("div");
  layer.id = "admin-modal-layer";
  layer.className = "admin-modal-layer";
  layer.innerHTML = `<div class="admin-modal-backdrop" data-modal-close></div><section class="admin-modal ${wide ? "admin-modal--wide" : ""}" role="dialog" aria-modal="true" aria-labelledby="admin-modal-title"><div class="admin-modal-handle" aria-hidden="true"></div><header class="admin-modal-header"><div>${kicker ? `<p class="admin-kicker">${esc(kicker)}</p>` : ""}<h2 id="admin-modal-title">${esc(title || "編集")}</h2></div><button class="admin-modal-close" type="button" data-modal-close aria-label="閉じる">×</button></header><div class="admin-modal-body">${body}</div></section>`;
  document.body.appendChild(layer);
  document.body.classList.add("admin-modal-open");
  layer.querySelectorAll("[data-modal-close]").forEach((el) => el.addEventListener("click", closeAdminModal));
  const dialog = layer.querySelector(".admin-modal");
  dialog?.addEventListener("click", (event) => event.stopPropagation());
  document.addEventListener("keydown", function escClose(event) {
    if (event.key !== "Escape") return;
    document.removeEventListener("keydown", escClose);
    closeAdminModal();
  }, { once: true });
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

async function requestJson(url, options = {}) {
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
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
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
  return `<article class="admin-team-card" data-team-id="${esc(team.id)}">
    <div class="admin-team-card-main">
      <div class="admin-team-title"><span class="admin-status admin-status--${esc(team.status)}">${statusLabel}</span><h3>${esc(team.name)}</h3><p class="admin-id">${esc(team.id)}</p></div>
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

function wireSystemDashboard(teams) {
  document.querySelector("#system-logout")?.addEventListener("click", async () => {
    await fetch("/api/system/logout", { method: "POST" });
    renderSystemLogin();
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
          const payload = Object.fromEntries(new FormData(event.currentTarget).entries());
          if (!isValidAdminCredential(payload.adminPassword)) return modalError(adminCredentialMessage());
          setButtonBusy(submit, true, "登録しています…");
          const { response, data } = await requestJson("/api/system/teams", { method: "POST", body: JSON.stringify(payload) });
          if (!response.ok) { setButtonBusy(submit, false); return modalError(data.message || "登録できませんでした。"); }
          const playerUrl = teamUrl(data.team.id);
          const adminUrl = new URL(`/t/${encodeURIComponent(data.team.id)}/admin`, window.location.origin).href;
          const playerQr = qrImageUrl(playerUrl, 280);
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
          const values = Object.fromEntries(new FormData(event.currentTarget).entries());
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
  if (!response.ok || !data.authenticated) return renderTeamAdminLogin(teamId, { teamName: data.teamName || "", error: response.status === 503 ? (data.message || "サーバーの認証設定を確認してください。") : "" });
  renderTeamDashboard(teamId);
}

function renderTeamAdminNotFound() {
  shell("チームが見つかりません", `<section class="admin-card admin-auth-card"><h1>チームが見つかりません</h1><p>管理URLを確認してください。</p><a class="button button-primary button-full" href="/">トップページへ</a></section>`);
}

function renderTeamAdminLogin(teamId, { teamName = "", error = "" } = {}) {
  shell("チーム管理ログイン", `<section class="admin-card admin-auth-card">
    <div class="admin-lock">⚾</div><p class="admin-kicker">TEAM ADMIN</p><h1>チーム管理</h1><p class="admin-lead">${teamName ? esc(teamName) : "サイン・動画を管理します"}</p>
    ${error ? notice(error, "error") : ""}
    <form id="team-admin-login-form" class="admin-form">
      <label>管理者パスワード<input class="text-input" id="team-admin-password" type="password" autocomplete="current-password" required></label>
      <p class="admin-help">新規設定・変更時は12文字以上で、英字と数字を含むパスワードを使用します。</p>
      <button class="button button-primary button-full" type="submit">管理画面に入る</button>
    </form>
    <a class="button button-secondary button-full" href="/t/${encodeURIComponent(teamId)}">選手用ページへ</a>
  </section>`);
  document.querySelector("#team-admin-login-form")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const password = document.querySelector("#team-admin-password").value;
    const submit = event.currentTarget.querySelector("button[type=submit]");
    submit.disabled = true;
    submit.textContent = "確認しています…";
    const { response, data } = await requestJson("/api/team-admin/auth", { method: "POST", body: JSON.stringify({ teamId, password }) });
    if (!response.ok) return renderTeamAdminLogin(teamId, { teamName, error: data.message || "管理者パスワードを確認してください。" });
    renderTeamDashboard(teamId);
  });
}

async function renderTeamDashboard(teamId, { message = "" } = {}) {
  shell("チーム管理", `<section class="admin-card admin-loading"><div class="spinner"></div><h1>サイン情報を読み込んでいます…</h1></section>`, `<button class="button button-ghost" id="team-admin-logout" type="button">ログアウト</button>`);
  const { response, data } = await requestJson(`/api/team-admin/team?teamId=${encodeURIComponent(teamId)}`);
  if (response.status === 401) return renderTeamAdminLogin(teamId);
  if (!response.ok) return shell("チーム管理", `<section class="admin-card"><h1>読み込めませんでした</h1>${notice(data.message || "もう一度お試しください。", "error")}</section>`);
  const team = data.team;
  const signs = data.signs || [];
  const groups = data.groups || [];
  const playerUrl = teamUrl(teamId);
  const qrSrc = qrImageUrl(playerUrl, 320);
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
  wireTeamDashboard(teamId, team, groups, signs, playerUrl);
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

function openTeamSettingsModal(teamId, team) {
  openAdminModal({
    title: "チーム設定",
    kicker: team.name,
    body: `<div id="admin-modal-error"></div><form id="team-settings-modal-form" class="admin-form"><label>チーム名<input class="text-input" name="name" type="text" maxlength="80" value="${esc(team.name)}" required></label><label>選手用合言葉を変更 <span class="admin-optional">変更時のみ</span><input class="text-input" name="passphrase" type="text" autocomplete="off"></label><label>管理者パスワードを変更 <span class="admin-optional">変更時のみ・12文字以上＋英字＋数字</span><input class="text-input" name="adminPassword" type="password" minlength="12" autocomplete="new-password"></label><p class="admin-help">合言葉や管理者パスワードを変更すると、既存セッションは安全のため失効します。</p><button class="button button-primary button-full" type="submit">保存する</button></form>`,
    onOpen(layer) {
      layer.querySelector("#team-settings-modal-form")?.addEventListener("submit", async (event) => {
        event.preventDefault();
        const submit = event.currentTarget.querySelector("button[type=submit]");
        const payload = { teamId, ...Object.fromEntries(new FormData(event.currentTarget).entries()) };
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
        event.preventDefault(); const fd = new FormData(event.currentTarget); const submit = event.currentTarget.querySelector("button[type=submit]"); setButtonBusy(submit, true);
        const payload = { teamId, name: fd.get("name"), description: fd.get("description"), youtubeUrl: fd.get("youtubeUrl") };
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
        event.preventDefault(); const fd = new FormData(event.currentTarget); const submit = event.currentTarget.querySelector("button[type=submit]"); setButtonBusy(submit, true);
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
        event.preventDefault(); const fd = new FormData(event.currentTarget); const submit = event.currentTarget.querySelector("button[type=submit]"); setButtonBusy(submit, true);
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

function wireTeamDashboard(teamId, team, groups, signs, playerUrl) {
  document.querySelector("#team-admin-logout")?.addEventListener("click", async () => { await fetch("/api/team-admin/logout", { method: "POST" }); renderTeamAdminLogin(teamId); });
  document.querySelector("#copy-player-url")?.addEventListener("click", () => copyText(playerUrl, document.querySelector("#copy-player-status")));
  document.querySelector("#share-player-native")?.addEventListener("click", () => shareTeamPage(team.name, playerUrl, document.querySelector("#copy-player-status")));
  document.querySelector("#share-player-line")?.addEventListener("click", () => shareTeamOnLine(team.name, playerUrl));
  document.querySelector("#open-team-settings")?.addEventListener("click", () => openTeamSettingsModal(teamId, team));
  document.querySelector("#open-add-group")?.addEventListener("click", () => openGroupModal(teamId));
  document.querySelectorAll("[data-edit-group]").forEach((button) => button.addEventListener("click", () => { const group = groups.find((item) => String(item.id) === String(button.dataset.editGroup)); if (group) openGroupModal(teamId, group); }));
  document.querySelectorAll("[data-preview-group-video]").forEach((button) => button.addEventListener("click", () => openVideoPreview(button.dataset.previewGroupVideo, `${button.dataset.groupTitle} / 説明動画`)));
  document.querySelector("#open-add-sign")?.addEventListener("click", () => openSignModal(teamId, groups));
  document.querySelectorAll("[data-edit-sign]").forEach((button) => button.addEventListener("click", () => { const sign = signs.find((item) => String(item.dbId) === String(button.dataset.editSign)); if (sign) openSignModal(teamId, groups, sign); }));
  document.querySelectorAll("[data-add-video]").forEach((button) => button.addEventListener("click", () => { const sign = signs.find((item) => String(item.dbId) === String(button.dataset.addVideo)); if (sign) openVideoModal(teamId, sign); }));
  document.querySelectorAll("[data-edit-video]").forEach((button) => button.addEventListener("click", () => { const sign = signs.find((item) => String(item.dbId) === String(button.dataset.signId)); const video = sign?.videoItems?.find((item) => String(item.id) === String(button.dataset.editVideo)); if (sign && video) openVideoModal(teamId, sign, video); }));
  document.querySelectorAll("[data-preview-video]").forEach((button) => button.addEventListener("click", () => openVideoPreview(button.dataset.videoIdValue, button.dataset.videoTitle)));
}
