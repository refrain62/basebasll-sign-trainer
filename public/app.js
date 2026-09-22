const TEAM_ID = "6BnWv2K3zo";
const TEAM_PATH = `/t/${TEAM_ID}`;
const LINE_TEAM_PATH = `${TEAM_PATH}?openExternalBrowser=1`;
const HISTORY_KEY = `sign-trainer:history:${TEAM_ID}`;
const HISTORY_LIMIT = 50;

const app = document.querySelector("#app");
const confirmDialog = document.querySelector("#confirm-dialog");
const logoutDialog = document.querySelector("#logout-dialog");

const state = {
  signs: [],
  teamName: "サイン練習チーム",
  deck: [],
  currentIndex: 0,
  results: [],
  startedAt: 0,
  player: null,
  playerReady: false,
  videoLoadTimer: null,
  pendingGradeTimer: null,
  reviewMode: false,
  lastMistakes: [],
  completedAt: 0,
  practiceMode: "10",
  sessionId: "",
  historySavedSessionId: ""
};

const icons = {
  menu: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  play: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.7v12.6L18.5 12 8 5.7Z" fill="currentColor"/></svg>',
  replay: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4.7 9A8 8 0 1 1 5 16.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M4 4v5h5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  chart: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 19V11M12 19V5M19 19v-8" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>',
  phone: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6.5" y="2.5" width="11" height="19" rx="2.2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M10 18.5h4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  check: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12.5 4.2 4L19 6.8" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  lock: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="10" width="14" height="10" rx="2.2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v2.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  eye: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.8 12s3.4-5 9.2-5 9.2 5 9.2 5-3.4 5-9.2 5-9.2-5-9.2-5Z" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="12" cy="12" r="2.4" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>',
  eyeOff: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m4 4 16 16M9.7 7.2A10.4 10.4 0 0 1 12 7c5.8 0 9.2 5 9.2 5a14.7 14.7 0 0 1-3 3.1M14.5 14.5A3.5 3.5 0 0 1 9.5 9.5M6.4 9.2A16.6 16.6 0 0 0 2.8 12s3.4 5 9.2 5c.8 0 1.6-.1 2.3-.3" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
  arrow: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h13M14 7l5 5-5 5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  users: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="8" r="3" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="17.5" cy="9.5" r="2.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M3.5 19c.4-3.3 2.2-5 5.5-5s5.1 1.7 5.5 5M14.5 14.5c2.9-.4 5 .9 5.8 3.8" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  target: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 2v3M22 12h-3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  smile: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/><path d="M8.5 10h.01M15.5 10h.01M8.5 14c1 1.3 2.2 2 3.5 2s2.5-.7 3.5-2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  clock: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 7v5l3 2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  close: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>'
};

const logo = `
  <span class="brand-mark" aria-hidden="true">
    <img class="brand-icon-img" src="/assets/sign-trainer-icon.png" alt="" width="128" height="128" decoding="async">
  </span>`;

function brand({ footer = false } = {}) {
  return `<a class="brand" href="/" data-nav aria-label="SIGN TRAINER トップページ">
    ${logo}
    <span class="brand-copy">
      <span class="brand-name">SIGN TRAINER</span>
      <span class="brand-sub">野球のサイン練習${footer ? "アプリ" : ""}</span>
    </span>
  </a>`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function navigate(path, { replace = false } = {}) {
  if (replace) history.replaceState({}, "", path);
  else history.pushState({}, "", path);
  route();
}

window.addEventListener("popstate", route);

document.addEventListener("click", (event) => {
  const link = event.target.closest("a[data-nav]");
  if (!link) return;
  const url = new URL(link.href);
  if (url.origin !== location.origin) return;
  event.preventDefault();
  navigate(`${url.pathname}${url.search}${url.hash}`);
});

async function route() {
  cleanupPlayer();
  clearTimeout(state.pendingGradeTimer);
  state.pendingGradeTimer = null;

  const path = location.pathname.replace(/\/$/, "") || "/";
  if (path === "/") {
    renderLanding();
    return;
  }

  if (path === TEAM_PATH) {
    renderLoading("チームを確認しています…", "初回だけ合言葉の確認があります。");
    const session = await getSession();
    state.teamName = session.teamName || state.teamName;
    if (session.authenticated) {
      const loaded = await loadSigns();
      if (loaded) renderPracticeSetup();
    } else {
      renderAuth();
    }
    return;
  }

  renderClientNotFound();
}

function renderLanding() {
  document.title = "SIGN TRAINER | 野球のサイン練習";
  app.innerHTML = `
    <div class="site-shell lp-v2">
      <header class="site-header">
        <div class="container header-inner">
          ${brand()}
          <nav class="header-nav" aria-label="メインナビゲーション">
            <a href="#features">特徴</a>
            <a href="#howto">使い方</a>
            <a href="#for-team">こんな方に</a>
            <a href="#faq">よくある質問</a>
            <a class="button button-primary button-small header-cta" href="${LINE_TEAM_PATH}" data-nav>サンプルを試す</a>
          </nav>
          <button class="mobile-menu-button" id="mobile-menu-button" type="button" aria-label="メニューを開く" aria-expanded="false">${icons.menu}</button>
        </div>
        <nav class="mobile-nav" id="mobile-nav" aria-label="スマートフォンメニュー">
          <a href="#features">特徴</a>
          <a href="#howto">使い方</a>
          <a href="#for-team">こんな方に</a>
          <a href="#faq">よくある質問</a>
          <a class="button button-primary" href="${LINE_TEAM_PATH}" data-nav>サンプルチームで試す</a>
        </nav>
      </header>

      <main>
        <section class="hero hero-reference">
          <div class="container hero-inner">
            <div class="hero-copy">
              <h1>見てわかる。<br><span class="hero-highlight">覚えて動ける。</span></h1>
              <p class="hero-subtitle">チームのサインを<br>みんなのチカラに。</p>
              <p class="hero-lead">実際のサイン動画を見て、何のサインかを答えるだけ。<br>くり返し練習して、試合で迷わない選手に。</p>
              <div class="hero-actions">
                <a class="button button-primary hero-cta" href="${LINE_TEAM_PATH}" data-nav>サンプルチームで試す ${icons.arrow}</a>
              </div>
              <p class="hero-note">登録不要で操作を体験できます</p>
              <p class="hero-team-note">正式利用では、チーム登録後に専用ページを発行し、そのURLをメンバーへ共有します。</p>
            </div>
            <div class="hero-script hero-script-top" aria-hidden="true">伝わる。<br>動ける。<br><small>もっと野球が楽しくなる。</small></div>
            <div class="hero-script hero-script-bottom" aria-hidden="true">サインを知ることは<br>チームを信じることだ。</div>
          </div>
        </section>

        <section id="features" class="feature-strip" aria-label="SIGN TRAINERの特徴">
          <div class="container feature-grid">
            ${featureItem(icons.play, "動画でわかる", "実際のサインを動画で確認")}
            ${featureItem(icons.replay, "くり返し練習", "ランダム出題でしっかり定着")}
            ${featureItem(icons.chart, "チームの成長", "みんなで覚えて強くなる")}
            ${featureItem(icons.phone, "すぐに使える", "インストール不要・スマホ対応")}
          </div>
        </section>

        <section class="lp-section why-section">
          <div class="container why-grid">
            <div class="why-copy">
              <h2 class="underline-heading">なぜサインの練習が大切？</h2>
              <p>サインが正しく伝わり、全員が同じ動きができると、<br>チームの力は大きく上がります。<br>サインを覚えることは、仲間を信じ、試合で力を<br>発揮するための大切な準備です。</p>
              <ul class="check-list">
                <li><span class="check-dot">✓</span><span>試合で迷わず動ける</span></li>
                <li><span class="check-dot">✓</span><span>チームの連携が高まる</span></li>
                <li><span class="check-dot">✓</span><span>野球がもっと楽しくなる</span></li>
              </ul>
            </div>
            <figure class="baseball-visual"><img src="/assets/why-baseball.png" alt="グラウンドに置かれた野球ボールと『ひとつのサインがチームを動かす。』のメッセージ"></figure>
          </div>
        </section>

        <section id="howto" class="lp-section howto-section">
          <div class="container">
            <div class="section-heading compact-heading">
              <h2 class="underline-heading">使い方はかんたん3ステップ</h2>
            </div>
            <div class="steps-grid reference-steps">
              ${stepCard(1, "練習設定", "問題数を選んでスタート", phoneSetupMock())}
              ${stepCard(2, "動画を見て答える", "サイン動画を見て\n何のサインか考えよう", phoneQuestionMock())}
              ${stepCard(3, "正解を確認", "答えを見て\n○×で進もう", phoneAnswerMock())}
              <div class="steps-side-note" aria-hidden="true">くり返すほど<br>自信になる。</div>
            </div>
          </div>
        </section>

        <section id="for-team" class="lp-section audience-section">
          <div class="container">
            <div class="section-heading compact-heading">
              <h2 class="underline-heading">こんなチーム・選手におすすめ</h2>
            </div>
            <div class="audience-grid">
              ${audienceCard(icons.users, "チーム全員で\nサインを統一したい")}
              ${audienceCard(icons.chart, "効率よく\nサインを覚えたい")}
              ${audienceCard(icons.smile, "楽しく\nくり返し練習したい")}
              ${audienceCard(icons.phone, "練習時間を\nもっと有効に使いたい")}
            </div>
          </div>
        </section>

        <section class="testimonials-section" aria-labelledby="testimonials-title">
          <div class="container">
            <h2 id="testimonials-title" class="testimonials-title">チームでの使い方</h2>
            <div class="testimonials-grid">
              <article class="testimonial-card">
                <p><strong>練習前の確認に</strong><br>集合前の数分で、その日のサインをチーム全員で確認できます。</p>
                <div class="testimonial-author"><span class="avatar">1</span><span>チーム練習</span></div>
              </article>
              <article class="testimonial-card">
                <p><strong>自宅での反復練習に</strong><br>LINEの専用URLから入り、自分のペースで何度でも練習できます。</p>
                <div class="testimonial-author"><span class="avatar">2</span><span>自主練習</span></div>
              </article>
              <article class="testimonial-card">
                <p><strong>間違えたサインの復習に</strong><br>練習後は間違えた問題だけを動画で確認して、もう一度出題できます。</p>
                <div class="testimonial-author"><span class="avatar">3</span><span>復習</span></div>
              </article>
            </div>
          </div>
        </section>

        <section class="reference-cta-band">
          <div class="container reference-cta-grid">
            <div class="cta-hand-note">⌁ 今日からはじめよう！</div>
            <div class="cta-center">
              <a class="button button-primary reference-cta-button" href="${LINE_TEAM_PATH}" data-nav>サンプルチームで試す ${icons.arrow}</a>
              <span>登録不要でサンプルを体験できます</span>
            </div>
            <div class="cta-hand-note is-right">覚えた分だけ<br>チームは強くなる。</div>
          </div>
        </section>

        <section id="faq" class="lp-section faq-section">
          <div class="container">
            <div class="section-heading compact-heading">
              <h2 class="underline-heading">よくある質問</h2>
            </div>
            <div class="faq-list">
              <details><summary>動画はどのように登録されていますか？</summary><p>YouTubeの限定公開動画を利用します。練習ページの合言葉認証前には、サイン名やYouTube動画IDをブラウザへ返しません。</p></details>
              <details><summary>スマホ以外でも使えますか？</summary><p>はい。スマートフォンを中心に設計していますが、タブレットやPCのブラウザでも利用できます。</p></details>
              <details><summary>チームではどのように利用しますか？</summary><p>チーム登録後に、そのチーム専用の練習ページとURLを発行します。監督・コーチがLINEなどでURLをメンバーへ共有し、メンバーはチームの合言葉を入力して練習します。</p></details>
              <details><summary>料金はかかりますか？</summary><p>料金体系はサービス提供時に案内します。現在のトップページではサンプルチームを体験できます。</p></details>
            </div>
          </div>
        </section>
      </main>

      <footer class="site-footer reference-footer">
        <div class="container footer-inner">
          ${brand({ footer: true })}
          <nav class="footer-nav" aria-label="フッターナビゲーション">
            <a href="/" data-nav>トップ</a><a href="#features">特徴</a><a href="#howto">使い方</a><a href="#for-team">こんな方に</a><a href="#faq">よくある質問</a>
          </nav>
          <div class="footer-tagline">野球を、もっとシンプルに。<br>もっと楽しく。</div>
          <div class="footer-meta">© 2026 SIGN TRAINER. All rights reserved.</div>
        </div>
      </footer>
    </div>`;

  wireLandingNavigation();
}

function wireLandingNavigation() {
  const menuButton = document.querySelector("#mobile-menu-button");
  const mobileNav = document.querySelector("#mobile-nav");
  if (menuButton && mobileNav) {
    menuButton.addEventListener("click", () => {
      const open = mobileNav.classList.toggle("is-open");
      menuButton.setAttribute("aria-expanded", String(open));
      menuButton.setAttribute("aria-label", open ? "メニューを閉じる" : "メニューを開く");
      menuButton.innerHTML = open ? icons.close : icons.menu;
    });
    mobileNav.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => {
        mobileNav.classList.remove("is-open");
        menuButton.setAttribute("aria-expanded", "false");
        menuButton.innerHTML = icons.menu;
      });
    });
  }
}

function featureItem(icon, title, text) {
  return `<div class="feature-item"><div class="feature-icon">${icon}</div><div><strong>${title}</strong><span>${text}</span></div></div>`;
}

function audienceCard(icon, text) {
  return `<article class="audience-card"><div class="audience-icon">${icon}</div><strong>${text.replace("\n", "<br>")}</strong></article>`;
}

function lineStep(no, title, text) {
  return `<article class="line-step"><span class="line-step-no">STEP ${no}</span><strong>${title}</strong><span>${text}</span></article>`;
}

function stepCard(no, title, text, phone) {
  return `<article class="step-card"><div class="step-label"><span class="step-number">${no}</span><div><h3>${title}</h3><p>${text}</p></div></div>${phone}</article>`;
}

function phoneSetupMock() {
  return `<div class="phone-mock" aria-hidden="true"><div class="phone-screen"><div class="phone-status"><span>9:41</span><span>•••</span></div><div class="phone-mini-header">練習設定</div><div class="phone-body"><div class="phone-title">問題数を選ぶ</div><div class="phone-choice">5問</div><div class="phone-choice is-green">10問</div><div class="phone-choice">20問</div><div class="phone-choice">全てのサイン</div><div class="phone-btn green">スタート</div></div></div></div>`;
}

function phoneQuestionMock() {
  return `<div class="phone-mock" aria-hidden="true"><div class="phone-screen"><div class="phone-status"><span>9:41</span><span>•••</span></div><div class="phone-mini-header">問題 1 / 10</div><div class="phone-body"><div class="phone-video"></div><div class="phone-question">このサインは<br>何でしょう？</div><div class="phone-btn green">答えを見る</div></div></div></div>`;
}

function phoneAnswerMock() {
  return `<div class="phone-mock" aria-hidden="true"><div class="phone-screen"><div class="phone-status"><span>9:41</span><span>•••</span></div><div class="phone-mini-header">問題 1 / 10</div><div class="phone-body"><div class="phone-answer-box"><small>正解は…</small><strong>エンドラン</strong></div><div class="phone-btn green">○ 正解した</div><div class="phone-btn red">× 間違えた</div></div></div></div>`;
}

function appTopbar(action = "") {
  return `<header class="app-topbar"><div class="app-topbar-inner">${brand()}${action}</div></header>`;
}

function renderAuth({ error = "", value = "" } = {}) {
  document.title = "合言葉を入力 | SIGN TRAINER";
  app.innerHTML = `<div class="app-bg auth-bg">
    ${appTopbar('<a class="button button-ghost" href="/" data-nav>トップへ</a>')}
    <main class="auth-main">
      <div class="auth-shell">
        <aside class="auth-visual" aria-hidden="true">
          <div class="auth-visual-shade"></div>
          <div class="auth-visual-copy">
            <p class="auth-visual-kicker">SIGN TRAINER</p>
            <p class="auth-visual-title">見てわかる。<br>覚えて動ける。</p>
            <p class="auth-visual-note">チームのサインを<br>みんなのチカラに。</p>
          </div>
        </aside>
        <section class="app-panel auth-panel">
          <div class="panel-icon" aria-hidden="true">${icons.lock}</div>
          <h1>チームのサイン練習</h1>
          <p class="panel-lead">合言葉を入力してください</p>
          <p class="team-label">${escapeHtml(state.teamName)}</p>
          <form id="auth-form" class="auth-form" novalidate>
            <label class="form-label" for="passphrase">合言葉</label>
            <div class="input-wrap">
              <input class="text-input" id="passphrase" name="passphrase" type="text" inputmode="text" lang="ja" autocomplete="off" autocapitalize="none" spellcheck="false" enterkeyhint="go" placeholder="例：ホームラン" value="${escapeHtml(value)}" required autofocus />
            </div>
            <p class="input-note">ひらがな・カタカナ・漢字でも入力できます。</p>
            ${error ? `<div class="form-error" role="alert"><span class="form-error-mark">!</span><span>${escapeHtml(error)}<br>もう一度確認して入力してください。</span></div>` : ""}
            <button class="button button-primary button-full" id="auth-submit" type="submit">練習をはじめる</button>
          </form>
          <p class="form-help">合言葉は監督・コーチに確認してください。</p>
          <div class="trust-note">${icons.check}<span>この端末では認証後、約30日間は合言葉の再入力を省略します。</span></div>
          <div class="back-link"><a href="/" data-nav>トップページに戻る</a></div>
        </section>
      </div>
    </main>
  </div>`;

  const form = document.querySelector("#auth-form");
  const input = document.querySelector("#passphrase");
  const submit = document.querySelector("#auth-submit");
  let isComposing = false;

  input.addEventListener("compositionstart", () => { isComposing = true; });
  input.addEventListener("compositionend", () => { isComposing = false; });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (isComposing) return;
    const passphrase = input.value.trim().normalize("NFC");
    if (!passphrase) {
      renderAuth({ error: "合言葉を入力してください。", value: input.value });
      return;
    }

    submit.disabled = true;
    submit.textContent = "確認しています…";

    try {
      const response = await fetch("/api/auth", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ passphrase })
      });
      const data = await response.json();
      if (!response.ok) {
        renderAuth({ error: data.message || "合言葉が違うようです。" });
        return;
      }
      state.teamName = data.teamName || state.teamName;
      renderLoading("練習を準備しています…", "サインデータを安全に読み込んでいます。");
      if (await loadSigns()) renderPracticeSetup();
    } catch {
      renderAuth({ error: "通信できませんでした。もう一度お試しください。", value: input.value });
    }
  });
}

async function getSession() {
  try {
    const response = await fetch("/api/session", { cache: "no-store" });
    if (!response.ok) return { authenticated: false };
    return await response.json();
  } catch {
    return { authenticated: false };
  }
}

async function loadSigns() {
  try {
    const response = await fetch("/api/signs", { cache: "no-store" });
    if (response.status === 401) {
      renderAuth();
      return false;
    }
    if (!response.ok) throw new Error("failed to load signs");
    const data = await response.json();
    state.signs = Array.isArray(data.signs) ? data.signs : [];
    state.teamName = data.team?.name || state.teamName;
    if (!state.signs.length) throw new Error("no signs");
    return true;
  } catch {
    renderAppError(
      "練習データを読み込めませんでした",
      "通信状態を確認して、もう一度お試しください。",
      async () => {
        renderLoading("練習データを読み込んでいます…", "通信環境によって数秒かかる場合があります。");
        if (await loadSigns()) renderPracticeSetup();
      }
    );
    return false;
  }
}

function renderPracticeSetup() {
  document.title = "サイン練習 | SIGN TRAINER";
  const history = getPracticeHistory();
  const latest = history[0];
  const historySub = latest
    ? `前回 ${latest.correct}/${latest.total}問正解 · ${formatHistoryDate(latest.completedAt, { short: true })}`
    : "練習すると、この端末に結果が残ります";

  app.innerHTML = `<div class="app-bg">
    ${appTopbar('<a class="button button-ghost" href="/" data-nav>トップへ</a>')}
    <main class="app-main">
      <section class="app-panel is-compact">
        <h1>サイン練習</h1>
        <p class="panel-lead">動画を見て、何のサインか答えよう！</p>
        <div class="setup-ball" aria-hidden="true">${logo}</div>
        <div class="choice-list">
          <button class="choice recommended" data-count="10" type="button"><span class="choice-copy"><span class="choice-main">10問ではじめる</span><span class="choice-sub">しっかり練習</span></span><span class="choice-badge">おすすめ</span></button>
          <button class="choice" data-count="5" type="button"><span class="choice-copy"><span class="choice-main">5問ではじめる</span><span class="choice-sub">サクッと練習</span></span><span class="choice-arrow">${icons.arrow}</span></button>
          <button class="choice" data-count="all" type="button"><span class="choice-copy"><span class="choice-main">全てのサイン</span><span class="choice-sub">じっくり練習 · ${state.signs.length}種類</span></span><span class="choice-arrow">${icons.arrow}</span></button>
        </div>
        <button class="history-entry-button" id="open-history" type="button">
          <span class="history-entry-icon">${icons.clock}</span>
          <span class="history-entry-copy"><strong>練習履歴を見る</strong><span>${escapeHtml(historySub)}</span></span>
          ${history.length ? `<span class="history-entry-count">${history.length}件</span>` : `<span class="history-entry-arrow">›</span>`}
        </button>
        <div class="practice-points" aria-label="練習のポイント">
          <div class="practice-point">${icons.check}<span>動画を見て何のサインか考える</span></div>
          <div class="practice-point">${icons.check}<span>答えを見て○×で自己採点</span></div>
          <div class="practice-point">${icons.check}<span>間違えた問題だけもう一度練習</span></div>
        </div>
        <button class="logout-link" id="logout" type="button">この端末の認証を解除</button>
      </section>
    </main>
  </div>`;

  document.querySelectorAll("[data-count]").forEach((button) => {
    button.addEventListener("click", () => {
      const count = button.dataset.count === "all" ? "all" : Number(button.dataset.count);
      startQuiz(count);
    });
  });
  document.querySelector("#open-history").addEventListener("click", renderPracticeHistory);
  document.querySelector("#logout").addEventListener("click", confirmLogout);
}

function confirmLogout() {
  if (!logoutDialog?.showModal) {
    if (confirm("この端末の認証を解除しますか？")) logout();
    return;
  }
  logoutDialog.showModal();
  const onClose = () => {
    logoutDialog.removeEventListener("close", onClose);
    if (logoutDialog.returnValue === "confirm") logout();
  };
  logoutDialog.addEventListener("close", onClose);
}

async function logout() {
  await fetch("/api/logout", { method: "POST" }).catch(() => null);
  state.signs = [];
  state.deck = [];
  state.results = [];
  renderAuth();
}

function startQuiz(count, sourceSigns = state.signs, { review = false } = {}) {
  if (!sourceSigns.length) {
    renderAppError("練習するサインがありません", "サインデータを確認してください。", renderPracticeSetup);
    return;
  }
  const targetCount = count === "all" ? sourceSigns.length : Math.max(1, Number(count));
  state.deck = buildDeck(sourceSigns, targetCount);
  state.currentIndex = 0;
  state.results = [];
  state.startedAt = Date.now();
  state.reviewMode = review;
  state.practiceMode = review ? "review" : (count === "all" ? "all" : String(targetCount));
  state.sessionId = `${state.startedAt}-${Math.random().toString(36).slice(2, 8)}`;
  state.historySavedSessionId = "";
  state.completedAt = 0;
  renderQuestion();
}

function buildDeck(signs, count) {
  const deck = [];
  let previousId = null;
  while (deck.length < count) {
    const batch = shuffle([...signs]);
    if (previousId && batch.length > 1 && batch[0].id === previousId) {
      [batch[0], batch[1]] = [batch[1], batch[0]];
    }
    for (const sign of batch) {
      if (deck.length >= count) break;
      deck.push({ ...sign, videoId: randomItem(sign.videos) });
      previousId = sign.id;
    }
  }
  return deck;
}

function shuffle(items) {
  for (let i = items.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
}

function randomItem(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function renderQuestion() {
  cleanupPlayer();
  const item = state.deck[state.currentIndex];
  if (!item) {
    renderResults();
    return;
  }
  const position = state.currentIndex + 1;
  const total = state.deck.length;
  const progress = Math.round(((position - 1) / total) * 100);
  document.title = `問題 ${position}/${total} | SIGN TRAINER`;

  app.innerHTML = `<div class="quiz-page">
    ${quizHeader(position, total, "exit")}
    <div class="progress-track"><div class="progress-value" id="quiz-progress-bar"></div></div>
    <main class="quiz-content">
      <section class="player-frame" id="player-frame">
        <div class="video-cover" id="video-cover">
          <div class="video-loading"><div class="spinner"></div><strong>動画を準備しています…</strong><small>数秒かかる場合があります</small></div>
        </div>
        <div id="youtube-player"></div>
      </section>
      <section class="quiz-question">
        <div class="question-mark" aria-hidden="true">?</div>
        <p class="question-text">このサインは<br>何でしょう？</p>
        <div class="quiz-actions">
          <button class="quiz-button quiz-button-primary" id="show-answer" type="button">答えを見る</button>
          <button class="quiz-button quiz-button-secondary" id="replay-video" type="button">${icons.replay} もう一度見る</button>
          <button class="quiz-button quiz-button-quiet" id="skip-question" type="button">この問題を飛ばす</button>
        </div>
      </section>
    </main>
  </div>`;

  setProgress(progress);
  document.querySelector("#exit-quiz").addEventListener("click", confirmExitQuiz);
  document.querySelector("#show-answer").addEventListener("click", () => renderAnswer(item));
  document.querySelector("#replay-video").addEventListener("click", () => replayVideo(item));
  document.querySelector("#skip-question").addEventListener("click", skipQuestion);

  // 問題画面を表示した時点でYouTube iframeを即生成する。
  // autoplayがブラウザに拒否されても、プレイヤー自体はロード済みになる。
  startVideo(item);
}

function quizHeader(position, total, action) {
  const left = action === "back"
    ? '<button class="quiz-back" id="answer-back" type="button">‹ 戻る</button>'
    : '<button class="quiz-exit" id="exit-quiz" type="button">× 終了</button>';
  return `<header class="quiz-header"><div class="quiz-header-inner">${left}<div class="quiz-progress">問題 ${position} / ${total}</div><span></span></div></header>`;
}

function setProgress(percent) {
  const progress = document.querySelector("#quiz-progress-bar");
  if (progress) progress.style.width = `${Math.max(0, Math.min(100, percent))}%`;
}

function buildYouTubeEmbedUrl(videoId) {
  const id = String(videoId || "").trim();
  if (!/^[A-Za-z0-9_-]{6,20}$/.test(id)) {
    throw new Error(`invalid youtube video id: ${id}`);
  }

  const params = new URLSearchParams({
    autoplay: "1",
    playsinline: "1",
    controls: "1",
    rel: "0"
  });

  // Shorts も通常動画も埋め込み時は同じ /embed/{videoId} を使う。
  return `https://www.youtube.com/embed/${encodeURIComponent(id)}?${params.toString()}`;
}

function startVideo(item) {
  const cover = document.querySelector("#video-cover");
  const mount = document.querySelector("#youtube-player");
  if (!cover || !mount) return;

  cleanupPlayer();
  cover.hidden = false;
  cover.classList.remove("is-hidden");
  cover.innerHTML = `<div class="video-loading"><div class="spinner"></div><strong>動画を準備しています…</strong><small>数秒かかる場合があります</small></div>`;

  let src;
  try {
    src = buildYouTubeEmbedUrl(item.videoId);
  } catch (error) {
    console.error("[SIGN TRAINER] YouTube video ID error", error, item);
    renderVideoError(item);
    return;
  }

  const iframe = document.createElement("iframe");
  iframe.title = `${item.name}のサイン動画`;
  iframe.src = src;
  iframe.loading = "eager";
  iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; fullscreen";
  iframe.referrerPolicy = "strict-origin-when-cross-origin";
  iframe.allowFullscreen = true;
  iframe.setAttribute("playsinline", "");

  state.player = iframe;
  state.playerReady = false;

  state.videoLoadTimer = window.setTimeout(() => {
    if (state.player !== iframe || state.playerReady) return;
    console.error("[SIGN TRAINER] YouTube embed load timeout", { videoId: item.videoId, src });
    renderVideoError(item, "動画の読み込みに時間がかかっています。通信環境を確認して、もう一度お試しください。");
  }, 12000);

  iframe.addEventListener("load", () => {
    if (state.player !== iframe) return;
    clearTimeout(state.videoLoadTimer);
    state.videoLoadTimer = null;
    state.playerReady = true;
    cover.hidden = true;
    cover.classList.add("is-hidden");
    console.info("[SIGN TRAINER] YouTube embed loaded", { videoId: item.videoId });
  }, { once: true });

  iframe.addEventListener("error", () => {
    if (state.player !== iframe) return;
    console.error("[SIGN TRAINER] YouTube embed network error", { videoId: item.videoId, src });
    renderVideoError(item);
  }, { once: true });

  mount.replaceChildren(iframe);
}

function replayVideo(item) {
  startVideo(item);
}

function renderVideoError(item, message = "通信環境を確認して、再度お試しください。") {
  cleanupPlayer();
  const frame = document.querySelector("#player-frame");
  if (!frame) return;
  frame.innerHTML = `<div class="video-cover"><div class="video-error"><div class="video-error-mark">!</div><h2>動画を読み込めませんでした</h2><p>${escapeHtml(message)}</p><div class="quiz-actions"><button class="quiz-button quiz-button-primary" id="retry-video" type="button">再試行する</button><button class="quiz-button quiz-button-secondary" id="skip-video-question" type="button">この問題を飛ばす</button></div></div></div>`;
  document.querySelector("#retry-video").addEventListener("click", () => {
    frame.innerHTML = '<div class="video-cover" id="video-cover"><div class="video-loading"><div class="spinner"></div><strong>動画を準備しています…</strong></div></div><div id="youtube-player"></div>';
    startVideo(item);
  });
  document.querySelector("#skip-video-question").addEventListener("click", skipQuestion);
}

function skipQuestion() {
  const item = state.deck[state.currentIndex];
  state.results.push({ sign: item, grade: "skipped" });
  goNextQuestion();
}

function renderAnswer(item) {
  cleanupPlayer();
  const position = state.currentIndex + 1;
  const total = state.deck.length;
  const progress = Math.round((position / total) * 100);
  document.title = `答え ${position}/${total} | SIGN TRAINER`;

  app.innerHTML = `<div class="answer-page">
    ${quizHeader(position, total, "back")}
    <div class="progress-track"><div class="progress-value" id="quiz-progress-bar"></div></div>
    <main class="answer-main">
      <div class="answer-box"><small>正解は…</small><div class="answer-name">${escapeHtml(item.name)}</div></div>
      <p class="grade-prompt">自分の答えを採点してください</p>
      <div class="grade-actions">
        <button class="grade-button grade-correct" data-grade="correct" type="button">○ 正解した</button>
        <button class="grade-button grade-wrong" data-grade="wrong" type="button">× 間違えた</button>
      </div>
      <div class="grade-status" id="grade-status" aria-live="polite"></div>
    </main>
  </div>`;

  setProgress(progress);
  document.querySelector("#answer-back").addEventListener("click", renderQuestion);
  document.querySelectorAll("[data-grade]").forEach((button) => {
    button.addEventListener("click", () => recordGrade(button.dataset.grade, item));
  });
}

function recordGrade(grade, item) {
  if (state.pendingGradeTimer) return;
  state.results.push({ sign: item, grade });
  renderGradeTransition(grade, item);
}

function renderGradeTransition(grade, item) {
  const correct = grade === "correct";
  const position = state.currentIndex + 1;
  const total = state.deck.length;
  const isLast = position >= total;
  document.title = `${correct ? "正解" : "記録しました"} | SIGN TRAINER`;
  app.innerHTML = `<main class="grade-transition">
    <div>
      <div class="transition-icon ${correct ? "" : "is-wrong"}">${correct ? icons.check : icons.close}</div>
      <h2>${correct ? "正解として記録しました" : "間違いとして記録しました"}</h2>
      <p>${isLast ? "結果をまとめています" : "つぎの問題へ進みます"}</p>
      <button class="transition-next" id="undo-grade" type="button">採点を変更</button>
    </div>
  </main>`;

  document.querySelector("#undo-grade").addEventListener("click", () => {
    clearTimeout(state.pendingGradeTimer);
    state.pendingGradeTimer = null;
    state.results.pop();
    renderAnswer(item);
  });

  state.pendingGradeTimer = setTimeout(() => {
    state.pendingGradeTimer = null;
    goNextQuestion();
  }, 1300);
}

function goNextQuestion() {
  clearTimeout(state.pendingGradeTimer);
  state.pendingGradeTimer = null;
  if (state.currentIndex + 1 >= state.deck.length) {
    renderResults();
    return;
  }
  state.currentIndex += 1;
  renderQuestion();
}

function renderResults() {
  cleanupPlayer();
  const correct = state.results.filter((result) => result.grade === "correct").length;
  const wrong = state.results.filter((result) => result.grade === "wrong").length;
  const skipped = state.results.filter((result) => result.grade === "skipped").length;
  const graded = correct + wrong;
  const totalQuestions = state.deck.length || state.results.length;
  const rate = totalQuestions ? Math.round((correct / totalQuestions) * 100) : 0;
  if (!state.completedAt) state.completedAt = Date.now();
  const seconds = Math.max(0, Math.round((state.completedAt - state.startedAt) / 1000));
  const mistakes = uniqueSigns(state.results.filter((result) => result.grade === "wrong").map((result) => result.sign));
  state.lastMistakes = mistakes;
  const title = state.reviewMode ? "復習結果" : "練習結果";
  const message = rate === 100 && totalQuestions ? "全問正解！よくできました。" : "よくがんばりました！";
  saveCurrentPracticeResult({ correct, wrong, skipped, totalQuestions, rate, seconds });
  document.title = `${title} | SIGN TRAINER`;

  app.innerHTML = `<div class="app-bg">
    ${appTopbar('<a class="button button-ghost" href="/" data-nav>トップへ</a>')}
    <main class="app-main">
      <section class="app-panel result-panel">
        <div class="result-title"><h1>${title}</h1><p>${message}</p></div>
        <div class="result-score" id="result-score"><div class="result-score-inner"><div class="result-score-big">${correct}<small> / ${totalQuestions || 0}問</small></div><span class="result-score-small">正答率 ${totalQuestions ? `${rate}%` : "—"}</span></div></div>
        <div class="result-stats">
          <div class="result-stat"><strong>${correct}</strong><span>正解</span></div>
          <div class="result-stat"><strong>${wrong}</strong><span>不正解</span></div>
          <div class="result-stat"><strong>${formatDuration(seconds)}</strong><span>時間${skipped ? `<br>${skipped}問スキップ` : ""}</span></div>
        </div>
        <div class="mistake-summary"><h3>${mistakes.length ? `間違えたサイン：${mistakes.length}種類` : "間違えたサインはありません"}</h3><p>${mistakes.length ? mistakes.map((sign) => escapeHtml(sign.name)).join("・") : "このセットはしっかり確認できました。"}</p></div>
        <div class="result-actions">
          ${mistakes.length ? `<button class="button button-primary button-full" id="review-mistakes" type="button">間違えた${mistakes.length}問をもう一度</button>` : ""}
          <button class="button button-secondary button-full" id="retry-10" type="button">もう一度10問</button>
          <button class="result-text-button" id="back-setup" type="button">問題数を選び直す</button>
        </div>
      </section>
    </main>
  </div>`;

  const score = document.querySelector("#result-score");
  if (score) score.style.setProperty("--score", String(rate));
  if (mistakes.length) document.querySelector("#review-mistakes").addEventListener("click", () => renderMistakeReview(mistakes));
  document.querySelector("#retry-10").addEventListener("click", () => startQuiz(10));
  document.querySelector("#back-setup").addEventListener("click", renderPracticeSetup);
}

function renderMistakeReview(mistakes = state.lastMistakes) {
  document.title = "間違えた問題 | SIGN TRAINER";
  state.lastMistakes = mistakes;
  app.innerHTML = `<div class="app-bg">
    ${appTopbar('<button class="button button-ghost" id="review-back" type="button">戻る</button>')}
    <main class="app-main">
      <section class="app-panel">
        <h1>間違えた問題（${mistakes.length}問）</h1>
        <p class="panel-lead">サインをタップすると、そのときの動画をもう一度確認できます。</p>
        <div class="review-list">
          ${mistakes.map((sign, index) => `<button class="review-item" data-review-index="${index}" type="button" aria-label="${escapeHtml(sign.name)}の動画をもう一度確認"><span class="review-no">${index + 1}</span><div class="review-copy"><strong>${escapeHtml(sign.name)}</strong><span>${icons.play} 動画をもう一度確認</span></div><span class="review-arrow" aria-hidden="true">›</span></button>`).join("")}
        </div>
        <div class="result-actions">
          <button class="button button-primary button-full" id="start-review" type="button">この${mistakes.length}問で練習する</button>
          <button class="result-text-button" id="review-back-bottom" type="button">結果に戻る</button>
        </div>
      </section>
    </main>
  </div>`;

  document.querySelectorAll("[data-review-index]").forEach((button) => {
    button.addEventListener("click", () => {
      const sign = mistakes[Number(button.dataset.reviewIndex)];
      if (sign) renderReviewVideo(sign, mistakes);
    });
  });
  document.querySelector("#start-review").addEventListener("click", () => startQuiz(mistakes.length, mistakes, { review: true }));
  document.querySelector("#review-back").addEventListener("click", renderResults);
  document.querySelector("#review-back-bottom").addEventListener("click", renderResults);
}

function renderReviewVideo(sign, mistakes = state.lastMistakes) {
  cleanupPlayer();
  document.title = `${sign.name}を確認 | SIGN TRAINER`;
  const reviewItem = { ...sign, videoId: sign.videoId || randomItem(sign.videos) };
  app.innerHTML = `<div class="quiz-page review-video-page">
    <header class="quiz-header"><div class="quiz-header-inner"><button class="quiz-back" id="review-video-back" type="button">‹ 一覧へ</button><div class="quiz-progress">動画で確認</div><span></span></div></header>
    <main class="quiz-content review-video-content">
      <div class="review-video-title"><span>間違えたサイン</span><h1>${escapeHtml(sign.name)}</h1></div>
      <section class="player-frame" id="player-frame">
        <div class="video-cover" id="video-cover"><div class="video-loading"><div class="spinner"></div><strong>動画を準備しています…</strong><small>数秒かかる場合があります</small></div></div>
        <div id="youtube-player"></div>
      </section>
      <div class="quiz-actions review-video-actions">
        <button class="quiz-button quiz-button-secondary" id="review-video-replay" type="button">${icons.replay} もう一度見る</button>
        <button class="quiz-button quiz-button-primary" id="review-video-back-bottom" type="button">間違えた問題一覧に戻る</button>
      </div>
    </main>
  </div>`;

  const back = () => { cleanupPlayer(); renderMistakeReview(mistakes); };
  document.querySelector("#review-video-back").addEventListener("click", back);
  document.querySelector("#review-video-back-bottom").addEventListener("click", back);
  document.querySelector("#review-video-replay").addEventListener("click", () => startReviewVideo(reviewItem, mistakes));
  startReviewVideo(reviewItem, mistakes);
}

function startReviewVideo(item, mistakes) {
  const cover = document.querySelector("#video-cover");
  const mount = document.querySelector("#youtube-player");
  if (!cover || !mount) return;

  cleanupPlayer();
  cover.hidden = false;
  cover.classList.remove("is-hidden");
  cover.innerHTML = `<div class="video-loading"><div class="spinner"></div><strong>動画を準備しています…</strong><small>数秒かかる場合があります</small></div>`;

  let src;
  try {
    src = buildYouTubeEmbedUrl(item.videoId);
  } catch (error) {
    console.error("[SIGN TRAINER] Review video ID error", error, item);
    renderReviewVideoError(item, mistakes);
    return;
  }

  const iframe = document.createElement("iframe");
  iframe.title = `${item.name}のサイン動画`;
  iframe.src = src;
  iframe.loading = "eager";
  iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; fullscreen";
  iframe.referrerPolicy = "strict-origin-when-cross-origin";
  iframe.allowFullscreen = true;
  iframe.setAttribute("playsinline", "");
  state.player = iframe;
  state.playerReady = false;

  state.videoLoadTimer = window.setTimeout(() => {
    if (state.player !== iframe || state.playerReady) return;
    renderReviewVideoError(item, mistakes, "動画の読み込みに時間がかかっています。通信環境を確認して、もう一度お試しください。");
  }, 12000);

  iframe.addEventListener("load", () => {
    if (state.player !== iframe) return;
    clearTimeout(state.videoLoadTimer);
    state.videoLoadTimer = null;
    state.playerReady = true;
    cover.hidden = true;
    cover.classList.add("is-hidden");
  }, { once: true });

  iframe.addEventListener("error", () => {
    if (state.player !== iframe) return;
    renderReviewVideoError(item, mistakes);
  }, { once: true });

  mount.replaceChildren(iframe);
}

function renderReviewVideoError(item, mistakes, message = "通信環境を確認して、再度お試しください。") {
  cleanupPlayer();
  const frame = document.querySelector("#player-frame");
  if (!frame) return;
  frame.innerHTML = `<div class="video-cover"><div class="video-error"><div class="video-error-mark">!</div><h2>動画を読み込めませんでした</h2><p>${escapeHtml(message)}</p><div class="quiz-actions"><button class="quiz-button quiz-button-primary" id="retry-review-video" type="button">再試行する</button><button class="quiz-button quiz-button-secondary" id="back-review-list" type="button">一覧に戻る</button></div></div></div>`;
  document.querySelector("#retry-review-video").addEventListener("click", () => renderReviewVideo(item, mistakes));
  document.querySelector("#back-review-list").addEventListener("click", () => renderMistakeReview(mistakes));
}

function getPracticeHistory() {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((entry) => entry && typeof entry.id === "string");
  } catch (error) {
    console.warn("[SIGN TRAINER] 練習履歴を読み込めませんでした", error);
    return [];
  }
}

function writePracticeHistory(history) {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, HISTORY_LIMIT)));
    return true;
  } catch (error) {
    console.warn("[SIGN TRAINER] 練習履歴を保存できませんでした", error);
    return false;
  }
}

function saveCurrentPracticeResult({ correct, wrong, skipped, totalQuestions, rate, seconds }) {
  if (!state.sessionId || state.historySavedSessionId === state.sessionId) return;
  const entry = {
    id: state.sessionId,
    teamId: TEAM_ID,
    teamName: state.teamName,
    startedAt: state.startedAt,
    completedAt: state.completedAt,
    mode: state.practiceMode,
    total: totalQuestions,
    correct,
    wrong,
    skipped,
    rate,
    durationSeconds: seconds,
    results: state.results.map((result) => ({
      id: result.sign.id,
      name: result.sign.name,
      grade: result.grade,
      videoId: result.sign.videoId || "",
      videos: Array.isArray(result.sign.videos) ? result.sign.videos.slice(0, 8) : []
    }))
  };
  const history = getPracticeHistory().filter((item) => item.id !== entry.id);
  history.unshift(entry);
  if (writePracticeHistory(history)) state.historySavedSessionId = state.sessionId;
}

function historyModeLabel(entry) {
  if (entry.mode === "review") return "間違い復習";
  if (entry.mode === "all") return "全サイン";
  const n = Number(entry.mode);
  return Number.isFinite(n) ? `${n}問` : `${entry.total || 0}問`;
}

function formatHistoryDate(timestamp, { short = false } = {}) {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return "日時不明";
  return new Intl.DateTimeFormat("ja-JP", short
    ? { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" }
    : { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" }
  ).format(date);
}

function getHistoryMistakeResults(entry) {
  return (entry.results || []).filter((result) => result.grade === "wrong");
}

function getHistoryMistakeSigns(entry) {
  const currentById = new Map(state.signs.map((sign) => [sign.id, sign]));
  const seen = new Set();
  const signs = [];
  for (const result of getHistoryMistakeResults(entry)) {
    if (seen.has(result.id)) continue;
    seen.add(result.id);
    const current = currentById.get(result.id);
    const fallbackVideos = [result.videoId, ...(result.videos || [])].filter(Boolean);
    signs.push({
      ...(current || {}),
      id: result.id,
      name: result.name,
      videos: current?.videos?.length ? current.videos : fallbackVideos,
      videoId: result.videoId || current?.videos?.[0] || fallbackVideos[0] || ""
    });
  }
  return signs.filter((sign) => sign.videos?.length || sign.videoId);
}

function renderPracticeHistory() {
  cleanupPlayer();
  const history = getPracticeHistory();
  document.title = "練習履歴 | SIGN TRAINER";
  app.innerHTML = `<div class="app-bg">
    ${appTopbar('<button class="button button-ghost" id="history-back" type="button">戻る</button>')}
    <main class="app-main">
      <section class="app-panel history-panel">
        <h1>練習履歴</h1>
        <p class="panel-lead">この端末で行った練習結果を確認できます。</p>
        ${history.length ? `<div class="history-list">
          ${history.map((entry) => {
            const mistakes = getHistoryMistakeResults(entry);
            const names = [...new Set(mistakes.map((item) => item.name))];
            return `<button class="history-card" data-history-id="${escapeHtml(entry.id)}" type="button">
              <span class="history-card-top"><span class="history-date">${escapeHtml(formatHistoryDate(entry.completedAt))}</span><span class="history-mode">${escapeHtml(historyModeLabel(entry))}</span></span>
              <span class="history-card-main"><strong>${entry.correct}<small> / ${entry.total}問</small></strong><span class="history-rate">正答率 ${entry.rate}%</span><span class="history-chevron">›</span></span>
              <span class="history-card-meta">${formatDuration(entry.durationSeconds || 0)}${entry.skipped ? ` · ${entry.skipped}問スキップ` : ""}</span>
              <span class="history-card-mistakes">${names.length ? `間違い：${escapeHtml(names.slice(0, 3).join("・"))}${names.length > 3 ? ` ほか${names.length - 3}件` : ""}` : "間違いなし"}</span>
            </button>`;
          }).join("")}
        </div>` : `<div class="history-empty"><div class="history-empty-icon">${icons.clock}</div><h2>まだ練習履歴はありません</h2><p>練習を最後まで終えると、結果がここに自動で保存されます。</p></div>`}
        <div class="result-actions"><button class="button button-primary button-full" id="history-start" type="button">練習をはじめる</button></div>
      </section>
    </main>
  </div>`;

  document.querySelector("#history-back").addEventListener("click", renderPracticeSetup);
  document.querySelector("#history-start").addEventListener("click", renderPracticeSetup);
  document.querySelectorAll("[data-history-id]").forEach((button) => {
    button.addEventListener("click", () => renderPracticeHistoryDetail(button.dataset.historyId));
  });
}

function renderPracticeHistoryDetail(historyId) {
  cleanupPlayer();
  const entry = getPracticeHistory().find((item) => item.id === historyId);
  if (!entry) {
    renderPracticeHistory();
    return;
  }
  const mistakes = getHistoryMistakeSigns(entry);
  document.title = `${formatHistoryDate(entry.completedAt, { short: true })}の練習 | SIGN TRAINER`;
  app.innerHTML = `<div class="app-bg">
    ${appTopbar('<button class="button button-ghost" id="history-detail-back" type="button">履歴へ</button>')}
    <main class="app-main">
      <section class="app-panel result-panel history-detail-panel">
        <div class="result-title"><h1>${escapeHtml(historyModeLabel(entry))}の結果</h1><p>${escapeHtml(formatHistoryDate(entry.completedAt))}</p></div>
        <div class="result-score" id="history-result-score"><div class="result-score-inner"><div class="result-score-big">${entry.correct}<small> / ${entry.total}問</small></div><span class="result-score-small">正答率 ${entry.rate}%</span></div></div>
        <div class="result-stats">
          <div class="result-stat"><strong>${entry.correct}</strong><span>正解</span></div>
          <div class="result-stat"><strong>${entry.wrong}</strong><span>不正解</span></div>
          <div class="result-stat"><strong>${formatDuration(entry.durationSeconds || 0)}</strong><span>練習時間${entry.skipped ? `<br>${entry.skipped}問スキップ` : ""}</span></div>
        </div>
        <div class="history-answer-list">
          ${(entry.results || []).map((result, index) => {
            const status = result.grade === "correct" ? "○" : result.grade === "wrong" ? "×" : "—";
            const label = result.grade === "correct" ? "正解" : result.grade === "wrong" ? "不正解" : "スキップ";
            return `<div class="history-answer-row is-${escapeHtml(result.grade)}"><span class="history-answer-no">${index + 1}</span><span class="history-answer-name">${escapeHtml(result.name)}</span><span class="history-answer-status"><b>${status}</b>${label}</span></div>`;
          }).join("")}
        </div>
        <div class="result-actions">
          ${mistakes.length ? `<button class="button button-primary button-full" id="history-review" type="button">間違えた${mistakes.length}問を練習する</button>` : ""}
          <button class="button button-secondary button-full" id="history-retry" type="button">もう一度${entry.mode === "all" ? "全サイン" : entry.total + "問"}</button>
          <button class="result-text-button" id="history-detail-back-bottom" type="button">練習履歴に戻る</button>
        </div>
      </section>
    </main>
  </div>`;
  const score = document.querySelector("#history-result-score");
  if (score) score.style.setProperty("--score", String(entry.rate || 0));
  const back = () => renderPracticeHistory();
  document.querySelector("#history-detail-back").addEventListener("click", back);
  document.querySelector("#history-detail-back-bottom").addEventListener("click", back);
  document.querySelector("#history-retry").addEventListener("click", () => startQuiz(entry.mode === "all" ? "all" : Math.max(1, entry.total || 10)));
  if (mistakes.length) document.querySelector("#history-review").addEventListener("click", () => startQuiz(mistakes.length, mistakes, { review: true }));
}

function uniqueSigns(signs) {
  const seen = new Set();
  return signs.filter((sign) => {
    if (seen.has(sign.id)) return false;
    seen.add(sign.id);
    return true;
  });
}

function formatDuration(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return minutes ? `${minutes}分${seconds}秒` : `${seconds}秒`;
}

function confirmExitQuiz() {
  if (!confirmDialog?.showModal) {
    if (confirm("練習を終了しますか？ここまでの進み具合は保存されません。")) renderPracticeSetup();
    return;
  }
  confirmDialog.showModal();
  const onClose = () => {
    confirmDialog.removeEventListener("close", onClose);
    if (confirmDialog.returnValue === "confirm") renderPracticeSetup();
  };
  confirmDialog.addEventListener("close", onClose);
}

function cleanupPlayer() {
  clearTimeout(state.videoLoadTimer);
  state.videoLoadTimer = null;
  state.playerReady = false;

  if (state.player instanceof HTMLElement) {
    try {
      state.player.remove();
    } catch {
      // Screen transition may already have detached the iframe.
    }
  }
  state.player = null;
}

function renderLoading(message, detail = "通信環境によって数秒かかる場合があります。") {
  app.innerHTML = `<div class="app-bg">${appTopbar()}<div class="loading-screen"><div class="loading-card"><div class="spinner"></div><h2>${escapeHtml(message)}</h2><p>${escapeHtml(detail)}</p></div></div></div>`;
}

function renderAppError(title, message, retry) {
  app.innerHTML = `<div class="app-bg">${appTopbar('<a class="button button-ghost" href="/" data-nav>トップへ</a>')}<main class="app-main"><section class="app-panel error-panel"><div class="error-symbol">!</div><h2>${escapeHtml(title)}</h2><p>${escapeHtml(message)}</p><div class="result-actions"><button class="button button-primary button-full" id="retry-app" type="button">もう一度試す</button></div></section></main></div>`;
  document.querySelector("#retry-app").addEventListener("click", retry);
}

function renderClientNotFound() {
  document.title = "ページが見つかりません | SIGN TRAINER";
  app.innerHTML = `<div class="app-bg">${appTopbar()}<main class="app-main"><section class="app-panel error-panel"><div class="error-symbol">?</div><h2>ページが見つかりません</h2><p>URLが正しいか確認してください。</p><div class="result-actions"><a class="button button-primary button-full" href="/" data-nav>トップページへ</a></div></section></main></div>`;
}

route();
