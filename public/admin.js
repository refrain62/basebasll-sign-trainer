import { qrImageUrl, teamUrl } from "./share-utils.js?v=57";

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

// ---------------- System admin ----------------
export async function renderSystemAdmin({ initialView = "list" } = {}) {
  shell("システム管理", `<section class="admin-card admin-loading"><div class="spinner"></div><h1>システム管理を確認しています…</h1></section>`);
  const { response, data } = await requestJson("/api/system/session");
  if (!response.ok || !data.authenticated) {
    renderSystemLogin({ afterLogin: initialView });
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
      <label>システム管理者キー<input class="text-input" id="system-secret" type="password" autocomplete="current-password" required></label>
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
    <section class="admin-hero-card">
      <div><p class="admin-kicker">SYSTEM ADMIN</p><h1>チーム管理</h1><p>登録チーム・サイン・利用状態を管理できます。</p></div>
      <button class="button button-primary" id="create-team-open" type="button">＋ 新しいチームを登録</button>
    </section>
    ${message ? notice(message, "success") : ""}
    <section class="admin-stats">
      <div><strong>${teams.length}</strong><span>登録チーム</span></div>
      <div><strong>${active}</strong><span>利用中</span></div>
      <div><strong>${teams.length - active}</strong><span>停止中</span></div>
      <div><strong>${teams.reduce((sum, t) => sum + Number(t.sign_count || 0), 0)}</strong><span>登録サイン</span></div>
    </section>
    <section class="admin-card ${view === "create" ? "" : "is-hidden"}" id="create-team-panel">
      <div class="admin-section-heading"><div><p class="admin-kicker">NEW TEAM</p><h2>新しいチームを登録</h2></div><button class="button button-ghost" id="create-team-close" type="button">閉じる</button></div>
      <form id="create-team-form" class="admin-form admin-form-grid">
        <label class="admin-field-wide">チーム名<input class="text-input" name="name" type="text" maxlength="80" placeholder="例：熊本○○ジュニア" required></label>
        <label>選手用合言葉<input class="text-input" name="passphrase" type="text" maxlength="100" autocomplete="off" required></label>
        <label>チーム管理者パスワード<input class="text-input" name="adminPassword" type="password" minlength="8" maxlength="200" autocomplete="new-password" required></label>
        <div class="admin-field-wide"><p class="admin-help">合言葉は選手が練習ページへ入るために使用。管理者パスワードはサイン編集用です。</p></div>
        <button class="button button-primary admin-field-wide" type="submit">チームを登録する</button>
      </form>
      <div id="create-team-result"></div>
    </section>
    <section class="admin-card">
      <div class="admin-section-heading"><div><p class="admin-kicker">TEAMS</p><h2>登録チーム</h2></div></div>
      ${teams.length ? `<div class="admin-team-list">${teams.map(systemTeamCard).join("")}</div>` : `<div class="admin-empty"><strong>まだチームがありません</strong><p>「新しいチームを登録」から作成してください。</p></div>`}
    </section>
  </div>`;
  shell("システム管理", body, `<button class="button button-ghost" id="system-logout" type="button">ログアウト</button>`);
  wireSystemDashboard(teams);
}

function systemTeamCard(team) {
  const statusLabel = team.status === "active" ? "利用中" : "停止中";
  return `<article class="admin-team-card" data-team-id="${esc(team.id)}">
    <div class="admin-team-card-main">
      <div><span class="admin-status admin-status--${esc(team.status)}">${statusLabel}</span><h3>${esc(team.name)}</h3><p class="admin-id">ID: ${esc(team.id)}</p></div>
      <div class="admin-team-counts"><span><strong>${Number(team.sign_count || 0)}</strong> サイン</span><span><strong>${Number(team.video_count || 0)}</strong> 動画</span></div>
    </div>
    <p class="admin-muted">登録: ${esc(formatDate(team.created_at))}</p>
    <div class="admin-button-row">
      <a class="button button-primary" href="/t/${encodeURIComponent(team.id)}/admin">チーム管理</a>
      <button class="button button-secondary" data-system-edit="${esc(team.id)}" type="button">設定</button>
      <button class="button ${team.status === "active" ? "button-secondary" : "button-primary"}" data-system-status="${esc(team.id)}" data-next-status="${team.status === "active" ? "suspended" : "active"}" type="button">${team.status === "active" ? "利用停止" : "利用再開"}</button>
    </div>
    <div class="admin-inline-editor is-hidden" id="system-edit-${esc(team.id)}">
      <form class="admin-form" data-system-edit-form="${esc(team.id)}">
        <label>チーム名<input class="text-input" name="name" type="text" maxlength="80" value="${esc(team.name)}" required></label>
        <label>選手用合言葉を変更 <span class="admin-optional">変更しない場合は空欄</span><input class="text-input" name="passphrase" type="text" autocomplete="off"></label>
        <label>管理者パスワードを変更 <span class="admin-optional">変更しない場合は空欄</span><input class="text-input" name="adminPassword" type="password" minlength="8" autocomplete="new-password"></label>
        <div class="admin-button-row"><button class="button button-primary" type="submit">保存</button><button class="button button-danger" data-system-delete="${esc(team.id)}" type="button">チームを削除</button></div>
      </form>
    </div>
  </article>`;
}

function wireSystemDashboard(teams) {
  document.querySelector("#system-logout")?.addEventListener("click", async () => {
    await fetch("/api/system/logout", { method: "POST" });
    renderSystemLogin();
  });
  const panel = document.querySelector("#create-team-panel");
  document.querySelector("#create-team-open")?.addEventListener("click", () => {
    panel?.classList.remove("is-hidden");
    panel?.scrollIntoView({ behavior: "smooth", block: "start" });
  });
  document.querySelector("#create-team-close")?.addEventListener("click", () => panel?.classList.add("is-hidden"));
  document.querySelector("#create-team-form")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const payload = Object.fromEntries(form.entries());
    const submit = event.currentTarget.querySelector("button[type=submit]");
    submit.disabled = true;
    submit.textContent = "登録しています…";
    const { response, data } = await requestJson("/api/system/teams", { method: "POST", body: JSON.stringify(payload) });
    if (!response.ok) {
      submit.disabled = false;
      submit.textContent = "チームを登録する";
      document.querySelector("#create-team-result").innerHTML = notice(data.message || "登録できませんでした。", "error");
      return;
    }
    const playerUrl = teamUrl(data.team.id);
    const adminUrl = new URL(`/t/${encodeURIComponent(data.team.id)}/admin`, window.location.origin).href;
    const playerQr = qrImageUrl(playerUrl, 280);
    document.querySelector("#create-team-result").innerHTML = `<div class="admin-created-team"><h3>登録しました</h3><p><strong>${esc(data.team.name)}</strong></p><label>選手用URL<div class="admin-copy-row"><input class="text-input" readonly value="${esc(playerUrl)}"><button class="button button-secondary" data-copy="${esc(playerUrl)}" type="button">コピー</button></div></label><div class="admin-qr-wrap"><div class="admin-qr"><img src="${esc(playerQr)}" alt="${esc(data.team.name)}の選手用ページQRコード" width="220" height="220"><span class="admin-qr-logo"><img src="${ICON}" alt=""></span></div><p>この環境の参加URLから動的に生成しています</p></div><label>管理URL<div class="admin-copy-row"><input class="text-input" readonly value="${esc(adminUrl)}"><button class="button button-secondary" data-copy="${esc(adminUrl)}" type="button">コピー</button></div></label><p class="admin-help">選手用合言葉はURLとは別に伝えてください。</p><button class="button button-primary button-full" id="create-finish" type="button">チーム一覧を更新</button></div>`;
    document.querySelectorAll("[data-copy]").forEach((button) => button.addEventListener("click", () => copyText(button.dataset.copy, button)));
    document.querySelector("#create-finish")?.addEventListener("click", () => renderSystemDashboard({ message: "チームを登録しました。" }));
  });

  document.querySelectorAll("[data-system-edit]").forEach((button) => button.addEventListener("click", () => document.querySelector(`#system-edit-${CSS.escape(button.dataset.systemEdit)}`)?.classList.toggle("is-hidden")));
  document.querySelectorAll("[data-system-status]").forEach((button) => button.addEventListener("click", async () => {
    const teamId = button.dataset.systemStatus;
    const status = button.dataset.nextStatus;
    if (!confirm(status === "suspended" ? "このチームを利用停止にしますか？" : "このチームの利用を再開しますか？")) return;
    const { response, data } = await requestJson(`/api/system/teams/${encodeURIComponent(teamId)}`, { method: "PUT", body: JSON.stringify({ status }) });
    if (!response.ok) return alert(data.message || "更新できませんでした。");
    renderSystemDashboard({ message: status === "active" ? "利用を再開しました。" : "利用を停止しました。" });
  }));
  document.querySelectorAll("[data-system-edit-form]").forEach((form) => form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const teamId = event.currentTarget.dataset.systemEditForm;
    const values = Object.fromEntries(new FormData(event.currentTarget).entries());
    const { response, data } = await requestJson(`/api/system/teams/${encodeURIComponent(teamId)}`, { method: "PUT", body: JSON.stringify(values) });
    if (!response.ok) return alert(data.message || "保存できませんでした。");
    renderSystemDashboard({ message: "チーム設定を保存しました。" });
  }));
  document.querySelectorAll("[data-system-delete]").forEach((button) => button.addEventListener("click", async () => {
    const teamId = button.dataset.systemDelete;
    const team = teams.find((t) => t.id === teamId);
    if (!confirm(`「${team?.name || teamId}」を削除します。サイン・動画設定も削除されます。よろしいですか？`)) return;
    if (!confirm("この操作は元に戻せません。本当に削除しますか？")) return;
    const { response, data } = await requestJson(`/api/system/teams/${encodeURIComponent(teamId)}`, { method: "DELETE" });
    if (!response.ok) return alert(data.message || "削除できませんでした。");
    renderSystemDashboard({ message: "チームを削除しました。" });
  }));
}

// ---------------- Team admin ----------------
export async function renderTeamAdmin(teamId) {
  shell("チーム管理", `<section class="admin-card admin-loading"><div class="spinner"></div><h1>チーム管理を確認しています…</h1></section>`);
  const { response, data } = await requestJson(`/api/team-admin/session?teamId=${encodeURIComponent(teamId)}`);
  if (response.status === 404) return renderTeamAdminNotFound();
  if (!response.ok || !data.authenticated) return renderTeamAdminLogin(teamId, { teamName: data.teamName || "" });
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
  const playerUrl = teamUrl(teamId);
  const qrSrc = qrImageUrl(playerUrl, 320);
  const body = `<div class="admin-layout">
    <section class="admin-hero-card">
      <div><p class="admin-kicker">TEAM ADMIN</p><h1>${esc(team.name)}</h1><p>サイン・YouTube動画・チーム設定を管理できます。</p></div>
      <a class="button button-primary" href="/t/${encodeURIComponent(teamId)}">選手用ページを見る</a>
    </section>
    ${message ? notice(message, "success") : ""}
    <section class="admin-card">
      <div class="admin-section-heading"><div><p class="admin-kicker">SHARE</p><h2>チーム専用ページを共有</h2></div></div>
      <div class="admin-share-grid">
        <div class="admin-share-content">
          <p class="admin-share-lead">参加リンク・QRコード・LINE・スマホの共有メニューから、チームメンバーへ練習ページを配布できます。</p>
          <label>メンバー用URL<div class="admin-copy-row"><input class="text-input" id="team-player-url" readonly value="${esc(playerUrl)}"><button class="button button-primary" id="copy-player-url" type="button">リンクをコピー</button></div></label>
          <div class="admin-share-actions">
            <button class="button line-share-button" id="share-player-line" type="button">LINEでメンバーに共有</button>
            <button class="button button-secondary" id="share-player-native" type="button">その他のアプリで共有</button>
          </div>
          <p class="admin-help" id="copy-player-status">合言葉はURL・QRコードには含まれません。リンクとは別にチーム内で伝えてください。</p>
          <p class="admin-security-note">安全のため、参加リンクと合言葉は同じ共有メッセージにはまとめません。合言葉を変更したい場合は下の「チーム設定」から再設定できます。</p>
        </div>
        <div class="admin-qr-wrap"><div class="admin-qr"><img src="${esc(qrSrc)}" alt="${esc(team.name)}の選手用ページQRコード" width="220" height="220"><span class="admin-qr-logo"><img src="${ICON}" alt=""></span></div><p>別の端末から読み取って参加できます</p></div>
      </div>
    </section>
    <section class="admin-card">
      <div class="admin-section-heading"><div><p class="admin-kicker">TEAM SETTINGS</p><h2>チーム設定</h2></div></div>
      <form id="team-settings-form" class="admin-form admin-form-grid">
        <label class="admin-field-wide">チーム名<input class="text-input" name="name" type="text" maxlength="80" value="${esc(team.name)}" required></label>
        <label id="team-passphrase-setting">選手用合言葉を変更 <span class="admin-optional">変更時のみ入力</span><input class="text-input" name="passphrase" type="text" autocomplete="off"></label>
        <label>管理者パスワードを変更 <span class="admin-optional">変更時のみ入力</span><input class="text-input" name="adminPassword" type="password" minlength="8" autocomplete="new-password"></label>
        <button class="button button-primary admin-field-wide" type="submit">チーム設定を保存</button>
      </form>
    </section>
    <section class="admin-card">
      <div class="admin-section-heading"><div><p class="admin-kicker">SIGNS</p><h2>サイン管理 <span class="admin-count-badge">${signs.length}</span></h2></div></div>
      <form id="add-sign-form" class="admin-add-sign">
        <label>サイン名<input class="text-input" name="name" type="text" placeholder="例：ヒットエンドラン" required></label>
        <label>YouTube URL<input class="text-input" name="youtubeUrl" type="url" inputmode="url" placeholder="https://youtube.com/shorts/..." required></label>
        <button class="button button-primary" type="submit">＋ サインを追加</button>
      </form>
      <p class="admin-help">同じサインに動画を複数登録できます。練習では有効な動画からランダムに出題します。</p>
      <div class="admin-sign-list">${signs.length ? signs.map((sign, index) => teamSignCard(sign, index)).join("") : `<div class="admin-empty"><strong>サインがまだありません</strong><p>上のフォームから最初のサインを登録してください。</p></div>`}</div>
    </section>
  </div>`;
  shell("チーム管理", body, `<button class="button button-ghost" id="team-admin-logout" type="button">ログアウト</button>`);
  wireTeamDashboard(teamId, signs, playerUrl);
}

function teamSignCard(sign, index) {
  const videos = sign.videoItems || sign.videos || [];
  return `<article class="admin-sign-card" data-sign-id="${Number(sign.dbId)}">
    <div class="admin-sign-number">${index + 1}</div>
    <form class="admin-sign-form" data-sign-form="${Number(sign.dbId)}">
      <div class="admin-sign-fields">
        <label>サイン名<input class="text-input" name="name" type="text" maxlength="80" value="${esc(sign.name)}" required></label>
        <label>並び順<input class="text-input" name="sortOrder" type="number" value="${Number(sign.sortOrder || 0)}"></label>
        <label class="admin-toggle"><input name="enabled" type="checkbox" ${sign.enabled ? "checked" : ""}><span>練習で使用する</span></label>
      </div>
      <div class="admin-button-row"><button class="button button-primary" type="submit">サインを保存</button><button class="button button-danger" data-delete-sign="${Number(sign.dbId)}" type="button">削除</button></div>
    </form>
    <div class="admin-video-section"><h4>YouTube動画 <span>${videos.length}件</span></h4>
      <div class="admin-video-list">${videos.map((video) => teamVideoRow(sign, video)).join("")}</div>
      <form class="admin-add-video" data-add-video="${Number(sign.dbId)}"><input class="text-input" name="youtubeUrl" type="url" inputmode="url" placeholder="YouTube URLを追加" required><button class="button button-secondary" type="submit">動画を追加</button></form>
    </div>
  </article>`;
}

function teamVideoRow(sign, video) {
  return `<form class="admin-video-row" data-video-form="${Number(video.id)}">
    <div class="admin-video-url"><input class="text-input" name="youtubeUrl" type="url" value="${esc(video.youtubeUrl)}" required><a class="admin-youtube-link" href="https://youtu.be/${encodeURIComponent(video.videoId)}" target="_blank" rel="noopener">YouTubeで確認 ↗</a></div>
    <label class="admin-small-field">順<input class="text-input" name="sortOrder" type="number" value="${Number(video.sortOrder || 0)}"></label>
    <label class="admin-toggle"><input name="enabled" type="checkbox" ${video.enabled ? "checked" : ""}><span>有効</span></label>
    <button class="button button-secondary" type="submit">保存</button>
    <button class="button button-danger" data-delete-video="${Number(video.id)}" type="button">削除</button>
  </form>`;
}

function wireTeamDashboard(teamId, signs, playerUrl) {
  document.querySelector("#team-admin-logout")?.addEventListener("click", async () => {
    await fetch("/api/team-admin/logout", { method: "POST" });
    renderTeamAdminLogin(teamId);
  });
  document.querySelector("#copy-player-url")?.addEventListener("click", () => copyText(playerUrl, document.querySelector("#copy-player-status")));
  document.querySelector("#share-player-native")?.addEventListener("click", () => shareTeamPage(document.querySelector(".admin-hero-card h1")?.textContent?.trim() || "チーム", playerUrl, document.querySelector("#copy-player-status")));
  document.querySelector("#share-player-line")?.addEventListener("click", () => shareTeamOnLine(document.querySelector(".admin-hero-card h1")?.textContent?.trim() || "チーム", playerUrl));
  document.querySelector("#team-settings-form")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const payload = { teamId, ...Object.fromEntries(new FormData(event.currentTarget).entries()) };
    const { response, data } = await requestJson("/api/team-admin/team", { method: "PUT", body: JSON.stringify(payload) });
    if (!response.ok) return alert(data.message || "保存できませんでした。");
    renderTeamDashboard(teamId, { message: "チーム設定を保存しました。" });
  });
  document.querySelector("#add-sign-form")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const payload = { teamId, ...Object.fromEntries(new FormData(event.currentTarget).entries()) };
    const { response, data } = await requestJson("/api/team-admin/signs", { method: "POST", body: JSON.stringify(payload) });
    if (!response.ok) return alert(data.message || "サインを追加できませんでした。");
    renderTeamDashboard(teamId, { message: "サインを追加しました。" });
  });
  document.querySelectorAll("[data-sign-form]").forEach((form) => form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const signId = event.currentTarget.dataset.signForm;
    const fd = new FormData(event.currentTarget);
    const payload = { teamId, name: fd.get("name"), sortOrder: Number(fd.get("sortOrder")), enabled: fd.get("enabled") === "on" };
    const { response, data } = await requestJson(`/api/team-admin/signs/${encodeURIComponent(signId)}`, { method: "PUT", body: JSON.stringify(payload) });
    if (!response.ok) return alert(data.message || "保存できませんでした。");
    renderTeamDashboard(teamId, { message: "サインを保存しました。" });
  }));
  document.querySelectorAll("[data-delete-sign]").forEach((button) => button.addEventListener("click", async () => {
    const signId = button.dataset.deleteSign;
    const sign = signs.find((s) => String(s.dbId) === String(signId));
    if (!confirm(`「${sign?.name || "このサイン"}」を削除しますか？登録動画も削除されます。`)) return;
    const { response, data } = await requestJson(`/api/team-admin/signs/${encodeURIComponent(signId)}?teamId=${encodeURIComponent(teamId)}`, { method: "DELETE" });
    if (!response.ok) return alert(data.message || "削除できませんでした。");
    renderTeamDashboard(teamId, { message: "サインを削除しました。" });
  }));
  document.querySelectorAll("[data-add-video]").forEach((form) => form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const signId = event.currentTarget.dataset.addVideo;
    const youtubeUrl = new FormData(event.currentTarget).get("youtubeUrl");
    const { response, data } = await requestJson(`/api/team-admin/signs/${encodeURIComponent(signId)}/videos`, { method: "POST", body: JSON.stringify({ teamId, youtubeUrl }) });
    if (!response.ok) return alert(data.message || "動画を追加できませんでした。");
    renderTeamDashboard(teamId, { message: "動画を追加しました。" });
  }));
  document.querySelectorAll("[data-video-form]").forEach((form) => form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const videoId = event.currentTarget.dataset.videoForm;
    const fd = new FormData(event.currentTarget);
    const payload = { teamId, youtubeUrl: fd.get("youtubeUrl"), sortOrder: Number(fd.get("sortOrder")), enabled: fd.get("enabled") === "on" };
    const { response, data } = await requestJson(`/api/team-admin/videos/${encodeURIComponent(videoId)}`, { method: "PUT", body: JSON.stringify(payload) });
    if (!response.ok) return alert(data.message || "動画を保存できませんでした。");
    renderTeamDashboard(teamId, { message: "動画を保存しました。" });
  }));
  document.querySelectorAll("[data-delete-video]").forEach((button) => button.addEventListener("click", async () => {
    const videoId = button.dataset.deleteVideo;
    if (!confirm("この動画を削除しますか？")) return;
    const { response, data } = await requestJson(`/api/team-admin/videos/${encodeURIComponent(videoId)}?teamId=${encodeURIComponent(teamId)}`, { method: "DELETE" });
    if (!response.ok) return alert(data.message || "動画を削除できませんでした。");
    renderTeamDashboard(teamId, { message: "動画を削除しました。" });
  }));
}
