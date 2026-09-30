// Source of truth: TypeScript. Vite generates content-hashed browser bundles under public/build/.
import { initEnvironmentContextBadge } from "./environment-context";
export {};
const APP_BUILD = __APP_VERSION__;
const TERMS_VERSION = "2026-09-25";
const PRIVACY_VERSION = "2026-09-25";
console.info(`[SIGN TRAINER] build ${APP_BUILD} account`);

const app = document.querySelector("#account-app");
const dialog = document.querySelector("#account-dialog");
const dialogBody = document.querySelector("#account-dialog-body");
const path = location.pathname.replace(/\/$/, "") || "/";
const inviteMatch = path.match(/^\/join-admin\/([A-Za-z0-9_-]{20,200})$/);
const inviteToken = inviteMatch?.[1] || "";
const params = new URLSearchParams(location.search);

const esc = (value) => String(value ?? "").replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[char]));

function accountPager(total, pageSize = 6) {
  if (total <= pageSize) return "";
  const totalPages = Math.ceil(total / pageSize);
  return `<nav class="admin-pagination account-pagination" data-account-pager aria-label="管理チームのページ切り替え"><p class="admin-pagination-range"><strong data-account-pager-range>1〜${Math.min(pageSize, total)}</strong><span> / 全${total}件</span></p><div class="admin-pagination-buttons"><button class="button button-secondary admin-pagination-button" type="button" data-account-pager-prev disabled>‹ 前へ</button><span class="admin-pagination-status" data-account-pager-status>1 / ${totalPages}ページ</span><button class="button button-secondary admin-pagination-button" type="button" data-account-pager-next>次へ ›</button></div></nav>`;
}

function wireAccountTeamPager() {
  const grid = document.querySelector<HTMLElement>("[data-account-team-grid]");
  const pager = document.querySelector<HTMLElement>("[data-account-pager]");
  if (!grid || !pager) return;
  const items = [...grid.querySelectorAll<HTMLElement>("[data-account-team-item]")];
  const pageSize = Math.max(1, Number(grid.dataset.pageSize || 6));
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const prev = pager.querySelector<HTMLButtonElement>("[data-account-pager-prev]");
  const next = pager.querySelector<HTMLButtonElement>("[data-account-pager-next]");
  const status = pager.querySelector<HTMLElement>("[data-account-pager-status]");
  const range = pager.querySelector<HTMLElement>("[data-account-pager-range]");
  let page = 1;
  const renderPage = (scroll = false) => {
    const start = (page - 1) * pageSize;
    const end = Math.min(start + pageSize, items.length);
    items.forEach((item, index) => { item.hidden = index < start || index >= end; });
    if (status) status.textContent = `${page} / ${totalPages}ページ`;
    if (range) range.textContent = `${start + 1}〜${end}`;
    if (prev) prev.disabled = page <= 1;
    if (next) next.disabled = page >= totalPages;
    if (scroll) grid.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  prev?.addEventListener("click", () => { if (page > 1) { page -= 1; renderPage(true); } });
  next?.addEventListener("click", () => { if (page < totalPages) { page += 1; renderPage(true); } });
  renderPage();
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


function formatAccountDate(value) {
  if (!value) return "-";
  const text = String(value);
  const date = new Date(text.includes("T") ? text : `${text.replace(" ", "T")}Z`);
  if (Number.isNaN(date.getTime())) return text;
  return new Intl.DateTimeFormat("ja-JP", { year: "numeric", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(date);
}

function loginHistoryList(items = []) {
  if (!items.length) return `<div class="account-login-empty">まだログイン履歴はありません。次回のGoogle / LINEログインから記録されます。</div>`;
  return `<div class="account-login-history">${items.slice(0, 10).map((item) => {
    const providerKey = String(item?.detail?.provider || "account");
    const provider = providerKey === "line" ? "LINE" : providerKey === "google" ? "Google" : "アカウント";
    const providerIcon = providerKey === "line" ? '<img class="account-provider-badge-icon" src="/assets/line-brand-icon.svg" alt="">' : providerKey === "google" ? '<img class="account-provider-badge-icon" src="/assets/google-g-logo.svg" alt="">' : "";
    const intent = item?.detail?.intent === "reauth" ? "本人確認" : "ログイン";
    return `<div class="account-login-row"><span class="account-login-provider account-login-provider--${esc(providerKey)}">${providerIcon}${esc(provider)}</span><div><strong>${esc(intent)}</strong><span>${esc(formatAccountDate(item.createdAt))}</span></div></div>`;
  }).join("")}</div>`;
}

function providerLabel(provider) {
  return provider === "google" ? "Google" : "LINE";
}

function providerButtons(providers, { intent = "login", invite = "", returnTo = "" } = {}) {
  return ["google", "line"].map((provider) => {
    const enabled = Boolean(providers?.[provider]);
    const query = new URLSearchParams({ intent });
    if (invite) query.set("invite", invite);
    if (returnTo) query.set("returnTo", returnTo);
    if (!['reauth', 'delete-account'].includes(intent)) {
      query.set("terms", TERMS_VERSION);
      query.set("privacy", PRIVACY_VERSION);
    }
    const href = `/api/account/oauth/${provider}/start?${query}`;
    return `<a class="account-provider-button account-provider-button--${provider} ${enabled ? "" : "is-disabled"}" data-account-provider-link ${enabled ? `href="${esc(href)}"` : 'aria-disabled="true" tabindex="-1"'}>
      <span class="account-provider-mark" aria-hidden="true"><img src="${provider === "google" ? "/assets/google-g-logo.svg" : "/assets/line-login-icon.svg"}" alt=""></span>
      <span>${["invite", "reauth"].includes(intent) ? `${providerLabel(provider)}で本人確認` : `${providerLabel(provider)}で続ける`}</span>
    </a>`;
  }).join("");
}

function authErrorMessage(code) {
  const messages = {
    access_denied: "認証がキャンセルされました。",
    oauth_state_invalid: "認証の有効時間が切れました。もう一度お試しください。",
    oauth_callback_failed: "認証を完了できませんでした。プロバイダー設定を確認して、もう一度お試しください。",
    provider_not_configured: "認証プロバイダーがまだ設定されていません。",
    reauth_identity_mismatch: "本人確認に使ったGoogle / LINEアカウントが、現在ログイン中の管理者アカウントと一致しません。元のアカウントでやり直してください。"
  };
  return messages[code] || (code ? "認証を完了できませんでした。もう一度お試しください。" : "");
}

async function getProviders() {
  const { data } = await requestJson("/api/account/providers");
  return data.providers || { google: false, line: false };
}

async function openReauthDialog(data, fallbackReturnTo = "/account") {
  const providers = await getProviders();
  const returnTo = data?.returnTo || fallbackReturnTo;
  dialogBody.innerHTML = `<div class="account-dialog-card"><button class="account-dialog-close" type="button" data-close-dialog aria-label="閉じる">×</button><span class="account-eyebrow">SECURITY CHECK</span><h2>本人確認が必要です</h2><p>${esc(data?.message || "重要な操作のため、Google / LINEでもう一度本人確認してください。")}</p><div class="account-provider-stack">${providerButtons(providers, { intent: "reauth", returnTo })}</div><p class="account-provider-note">認証後、この画面に戻ります。戻ったら操作をもう一度実行してください。</p></div>`;
  dialog.showModal();
  dialogBody.querySelectorAll("[data-close-dialog]").forEach((button) => button.addEventListener("click", () => dialog.close()));
}

async function handleReauthResponse(response, data, returnTo) {
  if (response?.status !== 428 || data?.error !== "reauth_required") return false;
  await openReauthDialog(data, returnTo);
  return true;
}

async function openLegalConsentDialog(message = "利用規約とプライバシーポリシーの最新版への同意が必要です。") {
  const providers = await getProviders();
  dialogBody.innerHTML = `<div class="account-dialog-card"><button class="account-dialog-close" type="button" data-close-dialog aria-label="閉じる">×</button><span class="account-eyebrow">POLICY UPDATE</span><h2>利用条件をご確認ください</h2><p>${esc(message)}</p><p class="account-provider-note"><a href="/terms" target="_blank" rel="noopener">利用規約</a>と<a href="/privacy" target="_blank" rel="noopener">プライバシーポリシー</a>を確認してから、認証方法を選んでください。</p><div class="account-provider-stack">${providerButtons(providers, { intent: "login", returnTo: "/account" })}</div></div>`;
  dialog.showModal();
  dialogBody.querySelectorAll("[data-close-dialog]").forEach((button) => button.addEventListener("click", () => dialog.close()));
}

async function loadInvite() {
  if (!inviteToken) return null;
  const { response, data } = await requestJson(`/api/account/invites/${encodeURIComponent(inviteToken)}`);
  if (!response.ok) return { error: data.message || "この招待リンクは無効または期限切れです。" };
  return data.invite;
}

function renderUnauthenticated(providers, invite) {
  const error = authErrorMessage(params.get("authError"));
  const creating = params.get("create") === "1";
  const inviteInfo = invite && !invite.error ? `<div class="account-invite-summary">
      <span class="account-eyebrow">ADMIN INVITATION</span>
      <h1>${esc(invite.teamName)}</h1>
      <p>${invite.kind === "transfer" ? "メイン管理者の交代依頼です。" : "チームのサブ管理者として招待されています。"}</p>
      <dl><div><dt>招待した人</dt><dd>${esc(invite.creatorName || "チーム管理者")}</dd></div><div><dt>権限</dt><dd>${invite.kind === "transfer" ? "新しいメイン管理者" : "サブ管理者"}</dd></div></dl>
    </div>` : "";
  const intent = inviteToken ? "invite" : creating ? "register-team" : "login";
  app.innerHTML = `<div class="account-auth-layout">
    <section class="account-auth-card">
      ${inviteInfo || `<span class="account-eyebrow">TEAM ADMIN ACCOUNT</span><h1>${creating ? "チーム登録をはじめる" : "チーム管理者ログイン"}</h1><p>${creating ? "Google または LINEで管理者登録して、そのままチームを作成できます。" : "この画面は監督・コーチなど、チームを管理する方のログイン画面です。"}</p>`}
      ${error ? `<div class="notice notice-error">${esc(error)}</div>` : ""}
      ${invite?.error ? `<div class="notice notice-error">${esc(invite.error)}</div>` : ""}
      ${!invite?.error ? `<div class="account-provider-stack">${providerButtons(providers, { intent, invite: inviteToken })}</div><p class="account-provider-note">ログイン後に、チーム内で表示する管理者名（ハンドルネーム）を確認・変更できます。続けることで、<a href="/terms" target="_blank" rel="noopener">利用規約</a>と<a href="/privacy" target="_blank" rel="noopener">プライバシーポリシー</a>を確認し同意したものとして扱います。</p>` : ""}
      ${inviteInfo ? `<p class="account-provider-note">本人確認のあと、ハンドルネームと権限内容を確認してから「招待を承認する」を押すまで参加は確定しません。</p>` : ""}
      ${(!providers.google || !providers.line) ? `<p class="account-provider-note">利用できない認証方法は、運営側のOAuth設定完了後に有効になります。</p>` : ""}
      <div class="account-player-note"><strong>選手のみなさんへ</strong><p>練習用のチームページは、監督・コーチ・チーム管理者から共有されたURLやQRコードから開いてください。チームページが分からない場合は、監督やコーチに確認してください。</p></div>
      <div class="account-security-note"><strong>パスワード共有は不要</strong><p>管理者ごとに自分のGoogle / LINEアカウントでログインします。選手用の合言葉とは別管理です。</p></div>
      <a class="button button-secondary button-full" href="/">トップページへ戻る</a>
    </section>
  </div>`;
}

function teamCard(team) {
  const owner = team.role === "owner";
  const plan = team.plan || { name: "Free", isFree: true };
  return `<article class="account-team-card" data-account-team-item>
    <div><div class="account-team-badges"><span class="account-role ${owner ? "is-owner" : ""}">${owner ? "メイン管理者" : "サブ管理者"}</span><span class="account-plan-badge ${plan.isFree ? "is-free" : ""}">${esc(plan.name || "Free")}</span></div><h3>${esc(team.teamName)}</h3><p>${esc(team.teamId)}</p></div>
    <div class="account-team-actions"><a class="button button-primary" href="/t/${encodeURIComponent(team.teamId)}/admin">管理画面</a><a class="button button-secondary" href="/t/${encodeURIComponent(team.teamId)}">選手画面</a></div>
  </article>`;
}

function createTeamPanel(teamCreation: { limit?: number; ownedTeamCount?: number; canCreate?: boolean } = {}) {
  const limit = Number(teamCreation?.limit || 3);
  const owned = Number(teamCreation?.ownedTeamCount || 0);
  const canCreate = teamCreation?.canCreate !== false && owned < limit;
  return `<section class="account-panel account-create-panel" id="create-team-panel">
    <div class="account-section-heading"><div><span class="account-eyebrow">NEW TEAM</span><h2>新しいチームを登録</h2></div><button class="account-icon-button" id="close-create-team" type="button" aria-label="閉じる">×</button></div>
    <p>管理者パスワードは作りません。このアカウントが最初のメイン管理者になります。</p>
    <div class="account-team-create-limit ${canCreate ? "" : "is-full"}"><strong>新規作成 ${owned}/${limit}チーム</strong><span>招待でサブ管理者として参加するチームは、この上限に含みません。</span></div>
    <div id="create-team-error"></div>
    ${canCreate ? `<form class="account-form" id="create-team-form">
      <label>チーム名<input class="text-input" name="name" maxlength="80" placeholder="例：○○ジュニア" required></label>
      <label>選手用の合言葉<input class="text-input" name="passphrase" maxlength="200" autocomplete="off" placeholder="チーム内だけで共有する合言葉" required></label>
      <p class="account-form-note">選手はこの合言葉で練習画面へ入ります。管理者ログインにはGoogle / LINEを使用します。</p>
      <button class="button button-primary button-full" type="submit">チームを登録して管理画面へ</button>
    </form>` : `<div class="notice notice-warning"><strong>新規チーム作成の上限に達しています。</strong><br>既存チーム内でサイングループを使い分けるか、不要なチームの整理をご検討ください。</div>`}
  </section>`;
}

function openDeleteDialog(dashboard) {
  const owned = dashboard.teams.filter((team) => team.role === "owner");
  dialogBody.innerHTML = `<div class="account-dialog-card"><button class="account-dialog-close" type="button" data-close-dialog aria-label="閉じる">×</button><span class="account-eyebrow account-eyebrow--danger">DANGER ZONE</span><h2>アカウントを退会</h2>
    ${owned.length ? `<div class="notice notice-error">${owned.map((team) => esc(team.teamName)).join("、")} のメイン管理者です。先に各チームでメイン管理者を交代してください。</div>` : `<p>管理者として参加中のチームから外れ、SIGN TRAINER内の認証連携情報とチーム所属を削除し、アカウントを匿名化します。選手側の練習履歴には影響しません。LINE連携がある場合は退会処理の中でLINEの連動アプリ権限も解除します。Google側の連携許可はGoogleアカウントの設定からいつでも解除できます。</p><label class="account-confirm-label">確認のため「退会する」と入力<input class="text-input" id="delete-account-confirm" autocomplete="off"></label><button class="button button-danger button-full" id="confirm-delete-account" type="button" disabled>アカウントを退会する</button>`}
  </div>`;
  dialog.showModal();
  dialogBody.querySelectorAll("[data-close-dialog]").forEach((button) => button.addEventListener("click", () => dialog.close()));
  const input = dialogBody.querySelector("#delete-account-confirm");
  const button = dialogBody.querySelector("#confirm-delete-account");
  input?.addEventListener("input", () => { button.disabled = input.value.trim() !== "退会する"; });
  button?.addEventListener("click", async () => {
    button.disabled = true; button.textContent = "処理しています…";
    const { response, data } = await requestJson("/api/account/account", { method: "DELETE", body: JSON.stringify({ confirm: input.value.trim() }) });
    if (!response.ok) {
      button.disabled = false; button.textContent = "アカウントを退会する";
      if (response.status === 428 && data?.error === "line_deauthorization_required" && data.oauthUrl) {
        location.href = data.oauthUrl;
        return;
      }
      if (await handleReauthResponse(response, data, "/account")) return;
      return alert(data.message || "退会できませんでした。");
    }
    location.href = "/?accountDeleted=1";
  });
}

function openDisplayNameDialog(dashboard, { review = false } = {}) {
  const current = String(dashboard.user?.displayName || "");
  const returnTo = String(params.get("returnTo") || "");
  dialogBody.innerHTML = `<div class="account-dialog-card"><button class="account-dialog-close" type="button" data-close-dialog aria-label="閉じる">×</button><span class="account-eyebrow">ADMIN NAME</span><h2>${review ? "管理者名を確認してください" : "管理者名を変更"}</h2><p>${review ? "Google / LINEの名前ではなく、チーム内で分かりやすいハンドルネームをおすすめします。" : "チーム内にはこのハンドルネームが表示されます。"}</p><form id="display-name-form" class="account-form"><label>管理者名（ハンドルネーム）<input class="text-input" name="displayName" maxlength="40" autocomplete="nickname" value="${esc(current)}" required></label><p class="account-form-note">メールアドレスは本人以外の管理者には表示しません。</p><button class="button button-primary button-full" type="submit">${review ? "この名前で使う" : "変更する"}</button></form></div>`;
  dialog.showModal();
  const input = dialogBody.querySelector<HTMLInputElement>('input[name="displayName"]');
  if (review) { input?.focus(); input?.select(); }
  dialogBody.querySelectorAll("[data-close-dialog]").forEach((button) => button.addEventListener("click", () => dialog.close()));
  dialogBody.querySelector("#display-name-form")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget as HTMLFormElement;
    const fd = new FormData(form);
    const { response, data } = await requestJson("/api/account/profile", { method: "PATCH", body: JSON.stringify({ displayName: fd.get("displayName") }) });
    if (!response.ok) return alert(data.message || "管理者名を変更できませんでした。");
    if (returnTo.startsWith("/")) { location.href = returnTo; return; }
    const next = new URL(location.href);
    next.searchParams.delete("reviewName");
    next.searchParams.delete("returnTo");
    location.href = `${next.pathname}${next.search}`;
  });
}

function wireDashboard(dashboard) {
  wireAccountTeamPager();
  const teamCreation = dashboard.teamCreation || { limit: 3, ownedTeamCount: dashboard.teams?.filter((team) => team.role === "owner").length || 0, canCreate: true };
  document.querySelector("#account-logout")?.addEventListener("click", async () => { await fetch("/api/account/logout", { method: "POST" }); location.href = "/account"; });
  document.querySelector("#edit-display-name")?.addEventListener("click", () => openDisplayNameDialog(dashboard));
  document.querySelector("#review-display-name")?.addEventListener("click", () => openDisplayNameDialog(dashboard, { review: true }));
  if (dashboard.user?.needsDisplayNameReview && params.get("reviewName") === "1") {
    queueMicrotask(() => openDisplayNameDialog(dashboard, { review: true }));
  }
  document.querySelector("#open-create-team")?.addEventListener("click", () => { document.querySelector("#create-team-slot").innerHTML = createTeamPanel(teamCreation); wireCreateTeam(); document.querySelector("#create-team-panel")?.scrollIntoView({ behavior: "smooth", block: "start" }); });
  document.querySelector("#delete-account")?.addEventListener("click", () => openDeleteDialog(dashboard));
  if (params.get("create") === "1") { document.querySelector("#create-team-slot").innerHTML = createTeamPanel(teamCreation); wireCreateTeam(); }
}

function wireCreateTeam() {
  document.querySelector("#close-create-team")?.addEventListener("click", () => { document.querySelector("#create-team-slot").innerHTML = ""; history.replaceState({}, "", "/account"); });
  document.querySelector("#create-team-form")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget as HTMLFormElement;
    const submit = form.querySelector("button[type=submit]");
    const fd = new FormData(form);
    submit.disabled = true; submit.textContent = "登録しています…";
    const { response, data } = await requestJson("/api/account/teams", { method: "POST", body: JSON.stringify({ name: fd.get("name"), passphrase: fd.get("passphrase") }) });
    if (!response.ok) {
      submit.disabled = false; submit.textContent = "チームを登録して管理画面へ";
      if (response.status === 428 && data?.error === "legal_consent_required") {
        await openLegalConsentDialog(data.message);
        return;
      }
      document.querySelector("#create-team-error").innerHTML = `<div class="notice notice-error">${esc(data.message || "登録できませんでした。")}</div>`;
      return;
    }
    location.href = data.urls?.adminPath || `/t/${encodeURIComponent(data.team.id)}/admin`;
  });
}

function renderDashboard(dashboard) {
  const user = dashboard.user;
  const identities = dashboard.identities || [];
  const teams = dashboard.teams || [];
  const loginHistory = dashboard.loginHistory || [];
  const teamCreation = dashboard.teamCreation || { limit: 3, ownedTeamCount: teams.filter((team) => team.role === "owner").length, canCreate: true };
  app.innerHTML = `<div class="account-dashboard">
    ${user.needsDisplayNameReview ? `<section class="account-name-review-callout"><div><span class="account-eyebrow">DISPLAY NAME</span><h2>管理者名を確認してください</h2><p>現在はGoogle / LINEのプロフィール名が入っている場合があります。チーム内で分かりやすいハンドルネームに変更できます。</p></div><button class="button button-primary" id="review-display-name" type="button">名前を確認・変更する</button></section>` : ""}
    <section class="account-profile-card">
      <div class="account-profile-main"><span class="account-avatar account-avatar--fallback">${esc((user.displayName || "管").slice(0,1))}</span><div><span class="account-eyebrow">ADMIN ACCOUNT</span><h1>${esc(user.displayName)}</h1><p>${esc(user.email || "メールアドレス未取得")}</p><div class="account-provider-badges">${identities.map((item) => `<span><img class="account-provider-badge-icon" src="${item.provider === "google" ? "/assets/google-g-logo.svg" : "/assets/line-brand-icon.svg"}" alt="">${item.provider === "google" ? "Google" : "LINE"}</span>`).join("")}</div></div></div>
      <div class="account-profile-actions"><button class="button button-secondary" id="edit-display-name" type="button">管理者名を変更</button><button class="button button-ghost" id="account-logout" type="button">ログアウト</button></div>
    </section>
    <div id="create-team-slot"></div>
    <section class="account-panel">
      <div class="account-section-heading"><div><span class="account-eyebrow">YOUR TEAMS</span><h2>管理しているチーム</h2><p>${teams.length ? `${teams.length}チーム` : "まだチームがありません"} ・ 新規作成 ${Number(teamCreation.ownedTeamCount || 0)}/${Number(teamCreation.limit || 3)}</p></div><button class="button button-primary" id="open-create-team" type="button" ${teamCreation.canCreate === false ? "disabled" : ""}>＋ 新しいチーム</button></div>
      ${teams.length ? `<div class="account-team-grid" data-account-team-grid data-page-size="6">${teams.map(teamCard).join("")}</div>${accountPager(teams.length, 6)}` : `<div class="account-empty"><strong>最初のチームを登録しましょう</strong><p>チーム名と選手用合言葉だけで始められます。</p></div>`}
    </section>
    <section class="account-panel"><div class="account-section-heading"><div><span class="account-eyebrow">LOGIN HISTORY</span><h2>ログイン履歴</h2><p>Google / LINEで本人確認した履歴を新しい順に表示します。</p></div></div>${loginHistoryList(loginHistory)}</section>
    <section class="account-panel account-safety-panel"><div><span class="account-eyebrow">ACCOUNT SAFETY</span><h2>メイン管理者の交代・サブ管理者の退会はチーム管理画面から</h2><p>メイン管理者の交代はワンタイム招待リンクで安全に行えます。サブ管理者は自分でチームから退会できます。</p></div></section>
    <section class="account-panel account-danger-panel"><div><h2>アカウント退会</h2><p>メイン管理者になっているチームがある場合は、先にメイン管理者を交代する必要があります。</p></div><button class="button button-danger" id="delete-account" type="button">退会手続き</button></section>
  </div>`;
  wireDashboard(dashboard);
}

async function renderInviteForAuthenticated(dashboard, invite) {
  if (invite?.error) { app.innerHTML = `<section class="account-auth-card"><div class="notice notice-error">${esc(invite.error)}</div><a class="button button-primary button-full" href="/account">アカウントへ</a></section>`; return; }
  app.innerHTML = `<div class="account-auth-layout"><section class="account-auth-card"><span class="account-eyebrow">ADMIN INVITATION</span><h1>${esc(invite.teamName)}</h1><p>${invite.kind === "transfer" ? "この招待を承認すると、あなたが新しいメイン管理者になります。" : "このチームのサブ管理者として参加します。"}</p>${dashboard.user.needsDisplayNameReview ? `<div class="notice notice-info"><strong>先に管理者名を確認してください</strong><br>チーム内にはハンドルネームが表示されます。<br><a class="button button-primary button-full" href="/account?reviewName=1&returnTo=${encodeURIComponent(`/join-admin/${inviteToken}`)}">名前を確認・変更する</a></div>` : ""}<div class="account-current-user">${esc(dashboard.user.displayName)} として承認します</div><button class="button button-primary button-full" id="accept-invite" type="button" ${dashboard.user.needsDisplayNameReview ? "disabled" : ""}>招待を承認する</button><a class="button button-secondary button-full" href="/account">キャンセル</a></section></div>`;
  document.querySelector("#accept-invite")?.addEventListener("click", async (event) => {
    event.currentTarget.disabled = true; event.currentTarget.textContent = "承認しています…";
    const { response, data } = await requestJson(`/api/account/invites/${encodeURIComponent(inviteToken)}/accept`, { method: "POST" });
    if (!response.ok) { event.currentTarget.disabled = false; event.currentTarget.textContent = "招待を承認する"; if (await handleReauthResponse(response, data, `/join-admin/${encodeURIComponent(inviteToken)}`)) return; return alert(data.message || "承認できませんでした。"); }
    location.href = `/t/${encodeURIComponent(data.teamId)}/admin?inviteAccepted=1`;
  });
}

async function init() {
  const [providers, sessionResult, invite] = await Promise.all([
    getProviders(),
    requestJson("/api/account/session"),
    loadInvite()
  ]);
  if (!sessionResult.data.authenticated) { renderUnauthenticated(providers, invite); return; }
  if (inviteToken) { await renderInviteForAuthenticated(sessionResult.data, invite); return; }
  renderDashboard(sessionResult.data);
}

initEnvironmentContextBadge();

init().catch((error) => {
  console.error(error);
  app.innerHTML = `<section class="account-auth-card"><div class="notice notice-error">画面を読み込めませんでした。もう一度お試しください。</div><a class="button button-primary button-full" href="/account">再読み込み</a></section>`;
});
