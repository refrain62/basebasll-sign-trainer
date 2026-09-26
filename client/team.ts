// Source of truth: TypeScript. Vite generates content-hashed browser bundles under public/build/.
import { lineShareUrl, qrImageUrl, teamUrl, topUrl } from "./share-utils";
import { filterPracticeSigns, findPracticeGroup, getPracticeOptions } from "./practice-utils";

const APP_BUILD = __APP_VERSION__;
console.info(`[SIGN TRAINER] build ${APP_BUILD}`);

const SAMPLE_TEAM_ID = "6BnWv2K3zo";
const SAMPLE_TEAM_PATH = `/t/${SAMPLE_TEAM_ID}`;
const SAMPLE_LINE_TEAM_PATH = `${SAMPLE_TEAM_PATH}?openExternalBrowser=1`;
const HISTORY_LIMIT = 50;
let activeTeamId = SAMPLE_TEAM_ID;

function activeTeamPath() {
  return `/t/${activeTeamId}`;
}

function activeTeamPublicUrl() {
  return teamUrl(activeTeamId);
}

function historyKey() {
  return `sign-trainer:history:${activeTeamId}`;
}

const app = document.querySelector("#app");
const confirmDialog = document.querySelector("#confirm-dialog");
const logoutDialog = document.querySelector("#logout-dialog");
const shareDialog = document.querySelector("#share-dialog");

const state = {
  signs: [],
  groups: [],
  activeGroupId: null,
  teamName: "サイン練習チーム",
  plan: null as any,
  entitlements: {} as Record<string, any>,
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
  home: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m4 10 8-6 8 6v9a1 1 0 0 1-1 1h-5v-6h-4v6H5a1 1 0 0 1-1-1v-9Z" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  logout: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 5H5v14h5M14 8l4 4-4 4M8 12h10" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
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
  share: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="18" cy="5" r="2.4" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="6" cy="12" r="2.4" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="18" cy="19" r="2.4" fill="none" stroke="currentColor" stroke-width="2"/><path d="m8.2 10.9 7.5-4.4M8.2 13.1l7.5 4.4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  copy: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="8" y="8" width="11" height="11" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" fill="none" stroke="currentColor" stroke-width="2"/></svg>',
  qr: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4z" fill="none" stroke="currentColor" stroke-width="2"/><path d="M14 14h2v2h-2zM18 14h2v4h-2zM14 18h4v2h-4zM20 20h.01" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  close: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>'
};

const logo = `
  <span class="brand-mark" aria-hidden="true">
    <img class="brand-icon-img" src="/assets/sign-trainer-icon.webp?v=${encodeURIComponent(__APP_VERSION__)}" alt="" width="128" height="128" decoding="async">
  </span>`;

function brand({ footer = false } = {}) {
  return `<a class="brand" href="/" data-nav aria-label="SIGN TRAINER トップページ">
    ${logo}
    <span class="brand-copy">
      <span class="brand-name"><span class="brand-sign">SIGN</span> <span class="brand-trainer">TRAINER</span></span>
      <span class="brand-sub">野球のサインを、チームの力に。</span>
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


function absoluteUrl(path = "/") {
  return new URL(path, location.origin).toString();
}


function getResultCelebration(rate, totalQuestions) {
  if (!totalQuestions) {
    return { level: "none", badge: "RESULT", message: "結果を確認しましょう。", pieces: 0, waves: 0 };
  }
  if (rate >= 100) {
    return { level: "max", badge: "PERFECT!", message: "全問正解！パーフェクト！", pieces: 72, waves: 2 };
  }
  if (rate >= 80) {
    return { level: "high", badge: "GREAT!", message: "すごい！かなり身についています。", pieces: 46, waves: 2 };
  }
  if (rate >= 60) {
    return { level: "mid", badge: "NICE!", message: "よくがんばりました！", pieces: 28, waves: 1 };
  }
  if (rate >= 40) {
    return { level: "low", badge: "KEEP GOING", message: "あと少し！次の練習でもう一歩。", pieces: 12, waves: 1 };
  }
  return { level: "none", badge: "TRY AGAIN", message: "間違えたサインを見直して、もう一度！", pieces: 0, waves: 0 };
}

function removeResultCelebrationLayer() {
  document.querySelector("#result-celebration-layer")?.remove();
}

function createResultCelebrationLayer(celebration) {
  removeResultCelebrationLayer();
  if (!celebration || celebration.level === "none") return null;

  const layer = document.createElement("div");
  layer.id = "result-celebration-layer";
  layer.className = `result-celebration-screen result-celebration-screen--${celebration.level}`;
  layer.setAttribute("aria-hidden", "true");

  const canvas = document.createElement("canvas");
  canvas.className = "result-confetti-canvas";
  canvas.id = "result-confetti-canvas";
  layer.appendChild(canvas);

  const burstCount = celebration.level === "max" ? 3 : celebration.level === "high" ? 2 : celebration.level === "mid" ? 2 : celebration.level === "low" ? 1 : 0;
  if (burstCount) {
    const bursts = document.createElement("div");
    bursts.className = "celebration-bursts";
    const positions = ["left", "right", "center"];
    for (let index = 0; index < burstCount; index += 1) {
      const burst = document.createElement("span");
      burst.className = `celebration-burst celebration-burst--${positions[index] || "right"}`;
      burst.textContent = "🎉";
      burst.setAttribute("aria-hidden", "true");
      bursts.appendChild(burst);
    }
    layer.appendChild(bursts);
  }

  document.body.appendChild(layer);
  return canvas;
}

function runResultCelebration(celebration) {
  if (!celebration || celebration.level === "none") {
    removeResultCelebrationLayer();
    return;
  }

  const canvas = createResultCelebrationLayer(celebration);
  if (!(canvas instanceof HTMLCanvasElement) || !celebration.pieces) return;

  const ctx = canvas.getContext("2d", { alpha: true });
  if (!ctx) return;

  const reducedMotion = Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)").matches);

  const level = celebration.level;
  // iPhone/Safari では Reduce Motion が有効でも完全停止させず、
  // 紙吹雪の量と速度だけ控えめにして「散る」動きを残す。
  const motionScale = reducedMotion ? 0.62 : 1;
  const pieceCount = reducedMotion ? Math.max(10, Math.round(celebration.pieces * 0.48)) : celebration.pieces;
  const durationBase = level === "max" ? 3600 : level === "high" ? 3200 : level === "mid" ? 2800 : 2300;
  const duration = reducedMotion ? Math.round(durationBase * 0.88) : durationBase;
  const colors = ["#ffdc3d", "#16a865", "#173d73", "#ff7a59", "#ffffff", "#72d6ff"];
  let particles = [];
  let start = 0;
  let width = 0;
  let height = 0;
  let dpr = 1;

  const sizeCanvas = () => {
    const rect = canvas.getBoundingClientRect();
    width = Math.max(1, rect.width || window.innerWidth || document.documentElement.clientWidth || 1);
    height = Math.max(1, rect.height || window.innerHeight || document.documentElement.clientHeight || 1);
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, Math.round(width * dpr));
    canvas.height = Math.max(1, Math.round(height * dpr));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };

  const makeParticle = (index) => {
    const fromLeft = index % 2 === 0;
    const instant = index < Math.ceil(pieceCount * 0.38);
    return {
      x: instant ? Math.random() * width : (fromLeft ? -16 - Math.random() * 30 : width + 16 + Math.random() * 30),
      y: instant ? Math.random() * Math.min(height * 0.20, 150) : -24 - Math.random() * 80,
      vx: (instant ? (Math.random() - 0.5) * 2.8 : (fromLeft ? 1.5 + Math.random() * 2.8 : -1.5 - Math.random() * 2.8)) * motionScale,
      vy: (instant ? 1.2 + Math.random() * 2.3 : 1.0 + Math.random() * 2.0) * motionScale,
      w: 7 + Math.random() * 8,
      h: 10 + Math.random() * 13,
      angle: Math.random() * Math.PI,
      spin: (Math.random() - 0.5) * 0.24 * motionScale,
      delay: instant ? Math.random() * 80 : 80 + Math.random() * (level === "max" ? 520 : 340),
      color: colors[index % colors.length],
      circle: index % 5 === 0
    };
  };

  const drawParticle = (p, alpha) => {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.angle);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = p.color;
    if (p.circle) {
      ctx.beginPath();
      ctx.arc(0, 0, Math.max(3, p.w * 0.42), 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
    }
    ctx.restore();
  };

  const draw = (now) => {
    if (!document.body.contains(canvas)) return;
    const elapsed = now - start;
    ctx.clearRect(0, 0, width, height);
    const gravity = (level === "max" ? 0.060 : 0.072) * (reducedMotion ? 0.72 : 1);

    for (const p of particles) {
      if (elapsed < p.delay) continue;
      p.vy += gravity;
      p.x += p.vx;
      p.y += p.vy;
      p.angle += p.spin;
      const fade = elapsed > duration - 650 ? Math.max(0, (duration - elapsed) / 650) : 1;
      drawParticle(p, fade);
    }

    if (elapsed < duration) {
      requestAnimationFrame(draw);
    } else {
      ctx.clearRect(0, 0, width, height);
      removeResultCelebrationLayer();
    }
  };

  // iOS Safari / PWA で結果DOM確定前に0px判定されるのを避けるため、3フレーム待って開始する。
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      requestAnimationFrame((now) => {
        if (!document.body.contains(canvas)) return;
        sizeCanvas();

        // Reduce Motion 時も完全停止にはせず、量・速度・回転を抑えた穏やかな紙吹雪にする。
        // iPhone/PWA でも静止せず、上から散って落ちる動きを維持する。
        particles = Array.from({ length: pieceCount }, (_, index) => makeParticle(index));
        start = now;
        draw(now);
      });
    });
  });
}

function publicShareUrl() {
  return topUrl();
}

function teamShareUrl() {
  return activeTeamPublicUrl();
}

function lineTeamShareUrl() {
  return lineShareUrl(activeTeamPublicUrl());
}

async function copyText(value) {
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    const textarea = document.createElement("textarea");
    textarea.value = value;
    textarea.setAttribute("readonly", "");
    textarea.className = "clipboard-fallback";
    document.body.appendChild(textarea);
    textarea.select();
    const ok = document.execCommand("copy");
    textarea.remove();
    return ok;
  }
}

function sharePayload(target) {
  if (target === "team") {
    return {
      title: `${state.teamName || "SIGN TRAINER"} | サイン練習`,
      text: `【SIGN TRAINER】\n${state.teamName || "チーム"}のサイン練習ページです。\nリンクを開いて練習してください。合言葉はチーム内で確認してください。`,
      url: teamShareUrl(),
      label: "チームメンバー用ページ",
      note: "合言葉はURLやQRコードには含まれません。URLとは別にメンバーへ伝えてください。"
    };
  }
  return {
    title: "SIGN TRAINER | 野球のサイン練習",
    text: "動画を見て、野球のサインをくり返し練習できるSIGN TRAINERです。",
    url: publicShareUrl(),
    label: "SIGN TRAINERトップページ",
    note: "このQRコードはSIGN TRAINERの紹介ページを開きます。"
  };
}

async function openShareDialog(target = "site") {
  if (!shareDialog) return;
  const data = sharePayload(target);
  shareDialog.dataset.target = target;
  const title = shareDialog.querySelector("#share-title");
  const lead = shareDialog.querySelector("#share-lead");
  const urlInput = shareDialog.querySelector("#share-url");
  const qr = shareDialog.querySelector("#share-qr");
  const qrStatus = shareDialog.querySelector("#share-qr-status");
  const note = shareDialog.querySelector("#share-note");
  const copyStatus = shareDialog.querySelector("#share-copy-status");
  if (title) title.textContent = target === "team" ? "チームメンバーに共有" : `${data.label}を共有`;
  if (lead) lead.textContent = target === "team" ? "参加リンクをコピーするか、QRコード・LINE・スマホの共有メニューからメンバーへ送れます。" : "URL・QRコード・スマホの共有メニューから第三者へ送れます。";
  if (urlInput) urlInput.value = data.url;
  if (note) note.textContent = data.note;
  if (copyStatus) copyStatus.textContent = "";
  const nativeButton = shareDialog.querySelector("#share-native");
  const copyButton = shareDialog.querySelector("#share-copy");
  const lineButton = shareDialog.querySelector("#share-line");
  if (target === "team") {
    if (nativeButton) nativeButton.textContent = "その他のアプリで共有";
    if (copyButton) copyButton.textContent = "参加リンクをコピー";
    if (lineButton) lineButton.textContent = "LINEでメンバーに共有";
  } else {
    if (nativeButton) nativeButton.textContent = "共有メニューを開く";
    if (copyButton) copyButton.textContent = "リンクをコピー";
    if (lineButton) lineButton.textContent = "LINEで共有";
  }
  if (qrStatus) qrStatus.textContent = "QRコードを準備しています…";
  if (qr) {
    const qrCode = shareDialog.querySelector("#share-qr-code");
    qr.hidden = false;
    if (qrCode) qrCode.hidden = false;
    qr.alt = `${data.label}のQRコード`;
    qr.onload = () => {
      if (qrCode) qrCode.hidden = false;
      if (qrStatus) qrStatus.textContent = "中央のSIGN TRAINERアイコン付きQRです。別の端末から読み取って共有できます。";
    };
    qr.onerror = () => {
      qr.hidden = true;
      if (qrCode) qrCode.hidden = true;
      if (qrStatus) qrStatus.textContent = "QRコードを表示できませんでした。URLコピーをご利用ください。";
    };
    try {
      qr.src = await qrImageUrl(data.url, 360);
    } catch (error) {
      console.warn("QR generation failed", error);
      qr.hidden = true;
      if (qrCode) qrCode.hidden = true;
      if (qrStatus) qrStatus.textContent = "QRコードを表示できませんでした。URLコピーをご利用ください。";
    }
  }
  if (shareDialog.showModal) shareDialog.showModal();
  else shareDialog.setAttribute("open", "");
}

function initShareDialog() {
  if (!shareDialog || shareDialog.dataset.wired === "1") return;
  shareDialog.dataset.wired = "1";
  shareDialog.querySelector("#share-copy")?.addEventListener("click", async () => {
    const data = sharePayload(shareDialog.dataset.target || "site");
    const ok = await copyText(data.url);
    const status = shareDialog.querySelector("#share-copy-status");
    if (status) status.textContent = ok ? "リンクをコピーしました" : "コピーできませんでした";
  });
  shareDialog.querySelector("#share-native")?.addEventListener("click", async () => {
    const data = sharePayload(shareDialog.dataset.target || "site");
    if (navigator.share) {
      try { await navigator.share({ title: data.title, text: data.text, url: data.url }); } catch (error) {
        if (error?.name !== "AbortError") console.warn("share failed", error);
      }
    } else {
      const ok = await copyText(data.url);
      const status = shareDialog.querySelector("#share-copy-status");
      if (status) status.textContent = ok ? "共有メニュー非対応のため、リンクをコピーしました" : "このブラウザでは共有できません";
    }
  });
  shareDialog.querySelector("#share-line")?.addEventListener("click", () => {
    const target = shareDialog.dataset.target || "site";
    const data = sharePayload(target);
    const lineUrl = target === "team" ? lineTeamShareUrl() : data.url;
    const message = `${data.text}\n${lineUrl}`;
    window.open(`https://line.me/R/share?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
  });
  shareDialog.querySelector("#share-close")?.addEventListener("click", () => shareDialog.close?.());
}

function navigate(path, { replace = false } = {}) {
  if (replace) history.replaceState({}, "", path);
  else history.pushState({}, "", path);
  route();
}

window.addEventListener("popstate", route);

document.addEventListener("click", (event) => {
  const menuButton = (event.target as Element | null)?.closest?.("#practice-menu-button");
  if (menuButton) {
    const menu = document.querySelector<HTMLElement>("#practice-header-menu");
    if (menu) {
      const opening = menu.hidden;
      menu.hidden = !opening;
      menuButton.setAttribute("aria-expanded", opening ? "true" : "false");
      document.body.classList.toggle("practice-menu-open", opening);
    }
    return;
  }
  const menuClose = (event.target as Element | null)?.closest?.<HTMLElement>("[data-practice-menu-close]");
  if (menuClose) {
    const menu = document.querySelector<HTMLElement>("#practice-header-menu");
    if (menu) menu.hidden = true;
    document.querySelector("#practice-menu-button")?.setAttribute("aria-expanded", "false");
    document.body.classList.remove("practice-menu-open");
    return;
  }
  const menuAction = (event.target as Element | null)?.closest?.<HTMLElement>("[data-practice-menu-action]");
  if (menuAction) {
    const menu = document.querySelector<HTMLElement>("#practice-header-menu");
    if (menu) menu.hidden = true;
    document.querySelector("#practice-menu-button")?.setAttribute("aria-expanded", "false");
    document.body.classList.remove("practice-menu-open");
    const action = menuAction.dataset.practiceMenuAction;
    if (action === "practice") navigate(activeTeamPath());
    else if (action === "history") navigate(`${activeTeamPath()}?view=history`);
    else if (action === "analytics") navigate(`${activeTeamPath()}?view=analytics`);
    else if (action === "share") { initShareDialog(); void openShareDialog("team"); }
    else if (action === "logout") confirmLogout();
    return;
  }
  if (!(event.target as Element | null)?.closest?.(".app-topbar")) {
    const menu = document.querySelector<HTMLElement>("#practice-header-menu");
    if (menu && !menu.hidden) {
      menu.hidden = true;
      document.querySelector("#practice-menu-button")?.setAttribute("aria-expanded", "false");
      document.body.classList.remove("practice-menu-open");
    }
  }
  const link = (event.target as Element | null)?.closest?.("a[data-nav]") as HTMLAnchorElement | null;
  if (!link) return;
  const url = new URL(link.href);
  if (url.origin !== location.origin) return;
  event.preventDefault();
  document.body.classList.remove("practice-menu-open");
  navigate(`${url.pathname}${url.search}${url.hash}`);
});

async function route() {
  cleanupPlayer();
  clearTimeout(state.pendingGradeTimer);
  state.pendingGradeTimer = null;

  const path = location.pathname.replace(/\/$/, "") || "/";
  if (path === "/") {
    window.location.replace("/");
    return;
  }

  const teamMatch = path.match(/^\/t\/([A-Za-z0-9_-]+)$/);
  if (teamMatch) {
    const nextTeamId = teamMatch[1];
    if (activeTeamId !== nextTeamId) {
      activeTeamId = nextTeamId;
      state.signs = [];
      state.deck = [];
      state.results = [];
      state.teamName = "サイン練習チーム";
    }
    renderLoading("チームを確認しています…", "初回だけ合言葉の確認があります。");
    const session = await getSession();
    if (session.error === "team_not_found") {
      renderClientNotFound();
      return;
    }
    if (session.error === "team_inactive") {
      renderAppError("このチームは現在利用できません", session.message || "チーム管理者に確認してください。", () => navigate("/"));
      return;
    }
    if (session.error === "session_secret_not_configured" || session.error === "server_not_configured") {
      state.teamName = session.teamName || state.teamName;
      renderAuth({ error: session.message || "サーバーの認証設定を確認してください。", configError: true });
      return;
    }
    state.teamName = session.teamName || state.teamName;
    if (session.authenticated) {
      const loaded = await loadSigns();
      if (loaded) {
        const view = new URLSearchParams(location.search).get("view");
        if (view === "analytics") renderPracticeAnalyticsPage();
        else if (view === "history") renderPracticeHistory();
        else renderPracticeSetup();
      }
    } else {
      renderAuth();
    }
    return;
  }

  renderClientNotFound();
}

function appTopbar(action = "") {
  const analyticsBadge = practiceAnalyticsEnabled() ? "" : `<span class="practice-menu-premium">Pro</span>`;
  const requestedView = new URLSearchParams(location.search).get("view");
  const menuView = requestedView === "history" ? "history" : requestedView === "analytics" ? "analytics" : "practice";
  return `<header class="app-topbar app-topbar--modern"><div class="app-topbar-inner">${brand()}<div class="practice-header-actions">${action}<button class="mobile-menu-button practice-header-menu-button" id="practice-menu-button" type="button" aria-label="メニューを開く" aria-controls="practice-header-menu" aria-expanded="false">${icons.menu}</button></div></div></header><nav class="practice-header-menu" id="practice-header-menu" aria-label="練習ページメニュー" role="dialog" aria-modal="true" hidden>
    <header class="practice-header-menu-head"><div><span>チーム練習</span><strong>${escapeHtml(state.teamName || "サイン練習チーム")}</strong></div><button class="practice-header-menu-close" type="button" data-practice-menu-close aria-label="メニューを閉じる">${icons.close}</button></header>
    <div class="practice-header-menu-list">
      <button class="practice-header-menu-link ${menuView === "practice" ? "is-active" : ""}" type="button" data-practice-menu-action="practice"><span class="practice-header-menu-icon">${icons.play}</span><span>練習ページ</span><span class="practice-header-menu-arrow">›</span></button>
      <button class="practice-header-menu-link ${menuView === "history" ? "is-active" : ""}" type="button" data-practice-menu-action="history"><span class="practice-header-menu-icon">${icons.clock}</span><span>練習履歴</span><span class="practice-header-menu-arrow">›</span></button>
      <button class="practice-header-menu-link ${menuView === "analytics" ? "is-active" : ""}" type="button" data-practice-menu-action="analytics"><span class="practice-header-menu-icon">${icons.chart}</span><span>成績分析</span>${analyticsBadge}<span class="practice-header-menu-arrow">›</span></button>
      <button class="practice-header-menu-link" type="button" data-practice-menu-action="share"><span class="practice-header-menu-icon">${icons.share}</span><span>チームに共有</span><span class="practice-header-menu-arrow">›</span></button>
    </div>
    <div class="practice-header-menu-footer"><button class="practice-header-menu-link practice-header-menu-link--danger" type="button" data-practice-menu-action="logout"><span class="practice-header-menu-icon">${icons.logout}</span><span>この端末の認証を解除</span><span class="practice-header-menu-arrow">›</span></button></div>
  </nav>`;
}

function practiceTeamIdentity() {
  return `<div class="practice-home-team" aria-label="練習チーム"><span>練習チーム</span><strong>${escapeHtml(state.teamName || "サイン練習チーム")}</strong></div>`;
}

function renderAuth({ error = "", value = "", configError = false } = {}) {
  document.title = "合言葉を入力 | SIGN TRAINER";
  app.innerHTML = `<div class="app-bg auth-bg">
    ${appTopbar()}
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
          <div class="practice-team-identity"><span>TEAM</span><strong>${escapeHtml(state.teamName)}</strong></div>
          <h1>チームのサイン練習</h1>
          <p class="panel-lead">合言葉を入力してください</p>
          ${activeTeamId === SAMPLE_TEAM_ID ? '<p class="sample-passphrase-note">サンプルチームの合言葉は「<strong>ホームラン</strong>」を入力してください。</p>' : ''}
          <form id="auth-form" class="auth-form" novalidate>
            <label class="form-label" for="passphrase">合言葉</label>
            <div class="input-wrap">
              <input class="text-input" id="passphrase" name="passphrase" type="text" inputmode="text" lang="ja" autocomplete="off" autocapitalize="none" spellcheck="false" enterkeyhint="go" placeholder="例：ホームラン" value="${escapeHtml(value)}" required autofocus />
            </div>
            <p class="input-note">ひらがな・カタカナ・漢字でも入力できます。</p>
            ${error ? `<div class="form-error" role="alert"><span class="form-error-mark">!</span><span>${escapeHtml(error)}${configError ? "" : "<br>もう一度確認して入力してください。"}</span></div>` : ""}
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
        body: JSON.stringify({ teamId: activeTeamId, passphrase })
      });
      const data = await response.json();
      if (!response.ok) {
        if (response.status === 503) {
          console.error("SIGN TRAINER auth configuration is missing on the deployed Worker.", data);
          renderAuth({
            error: data.message || "現在、認証設定の準備中です。管理者にお知らせください。",
            value: input.value,
            configError: true
          });
          return;
        }
        renderAuth({ error: data.message || "合言葉が違うようです。", value: input.value });
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
    const response = await fetch(`/api/session?teamId=${encodeURIComponent(activeTeamId)}`, { cache: "no-store" });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) return { authenticated: false, ...data };
    return data;
  } catch {
    return { authenticated: false };
  }
}

async function loadSigns() {
  try {
    const response = await fetch(`/api/signs?teamId=${encodeURIComponent(activeTeamId)}`, { cache: "no-store" });
    if (response.status === 401) {
      renderAuth();
      return false;
    }
    if (!response.ok) throw new Error("failed to load signs");
    const data = await response.json();
    state.signs = Array.isArray(data.signs) ? data.signs : [];
    state.groups = Array.isArray(data.groups) ? data.groups : [];
    state.teamName = data.team?.name || state.teamName;
    state.plan = data.plan?.plan || null;
    state.entitlements = data.plan?.entitlements || {};
    if (!state.groups.length) {
      state.activeGroupId = "all";
    } else if (state.activeGroupId !== "all" && state.activeGroupId !== null && !state.groups.some((group) => Number(group.id) === Number(state.activeGroupId))) {
      state.activeGroupId = null;
    }
    if (!state.signs.length) {
      renderPracticeEmptyState();
      return false;
    }
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

function isPracticeReadySign(sign) {
  return Array.isArray(sign?.videos) && sign.videos.length > 0;
}

function currentPracticeSigns() {
  return filterPracticeSigns(state.signs, state.activeGroupId);
}

function selectedPracticeGroup() {
  return findPracticeGroup(state.groups, state.activeGroupId);
}

function selectPracticeGroup(groupId) {
  state.activeGroupId = groupId === "all" ? "all" : Number(groupId);
  renderPracticeSetup();
}

function youtubeThumbnailUrl(videoId) {
  if (!videoId) return "";
  return `https://i.ytimg.com/vi/${encodeURIComponent(videoId)}/hqdefault.jpg`;
}

function renderGroupSelection() {
  const groupCards = state.groups.map((group) => {
    const members = state.signs.filter((sign) => Number(sign.groupId) === Number(group.id));
    const playable = members.filter(isPracticeReadySign).length;
    const hasGuide = Boolean(group.videoId || group.description);
    const disabled = playable === 0;
    const countText = playable === members.length
      ? `${members.length}サイン`
      : `${members.length}サイン · ${playable}サイン練習可`;
    return `<article class="practice-group-option">
      <div class="practice-group-option-head">
        <div class="practice-group-option-title">
          <span class="practice-group-option-mark" aria-hidden="true">G</span>
          <div><h3>${escapeHtml(group.name)}</h3><p>${escapeHtml(countText)}</p></div>
        </div>
        ${group.videoId ? `<span class="practice-group-video-badge">▶ 説明動画あり</span>` : ""}
      </div>
      ${group.videoId ? `<button class="practice-group-thumbnail" data-review-group="${Number(group.id)}" type="button" aria-label="${escapeHtml(group.name)}の説明動画を見る"><img src="${escapeHtml(youtubeThumbnailUrl(group.videoId))}" alt="${escapeHtml(group.name)}の説明動画サムネイル" loading="lazy" decoding="async"><span><b>▶</b> 説明動画を見る</span></button>` : ""}
      ${group.description ? `<p class="practice-group-option-description">${escapeHtml(group.description)}</p>` : `<p class="practice-group-option-description is-muted">このグループの説明はまだ登録されていません。</p>`}
      <div class="practice-group-option-actions">
        ${hasGuide ? `<button class="button button-secondary" data-review-group="${Number(group.id)}" type="button">説明を見る</button>` : ""}
        <button class="button button-primary" data-choose-group="${Number(group.id)}" type="button" ${disabled ? "disabled" : ""}>${disabled ? "練習できる動画がありません" : "このグループで練習する"}</button>
      </div>
    </article>`;
  }).join("");

  const allPlayable = state.signs.filter(isPracticeReadySign).length;
  const allCount = allPlayable === state.signs.length
    ? `${state.signs.length}サイン`
    : `${state.signs.length}サイン · ${allPlayable}サイン練習可`;

  return `<section class="practice-step practice-step--groups">
    <div class="practice-step-label"><span>STEP 1</span><strong>練習するサインを選ぶ</strong></div>
    <div class="practice-step-heading"><h2>今日はどのサインを練習しますか？</h2><p>チーム内で決めたグループを選んでください。必要なら説明を確認してから始められます。</p></div>
    <div class="practice-group-options">${groupCards}</div>
    <div class="practice-all-divider"><span>または</span></div>
    <article class="practice-all-option">
      <div><span class="practice-all-kicker">ALL SIGNS</span><h3>すべてのサインを練習</h3><p>${escapeHtml(allCount)}をグループに関係なくまとめて練習します。</p></div>
      <button class="button button-secondary button-full" data-choose-group="all" type="button" ${allPlayable ? "" : "disabled"}>すべてのサインで練習する</button>
    </article>
  </section>`;
}

function renderSelectedGroupSummary(group, totalCount, playableCount, canChange) {
  const canReview = group && group.id !== "all" && (group.videoId || group.description);
  const countText = playableCount === totalCount ? `${totalCount}サイン` : `${totalCount}サイン · ${playableCount}サイン練習可`;
  return `<section class="practice-selected-group" aria-label="今回の練習対象">
    <div class="practice-selected-copy"><span class="practice-selected-kicker">今回の練習</span><strong>${escapeHtml(group?.name || "すべてのサイン")}</strong><span>${escapeHtml(countText)}</span></div>
    <div class="practice-selected-actions">${canReview ? `<button class="practice-selected-guide" data-review-selected type="button">説明を見る</button>` : ""}${canChange ? `<button class="practice-selected-change" id="change-practice-group" type="button">変更</button>` : ""}</div>
  </section>`;
}

function openGroupReview(group) {
  document.querySelector("#group-review-layer")?.remove();
  const layer = document.createElement("div");
  layer.id = "group-review-layer";
  layer.className = "group-review-layer";
  const members = state.signs.filter((sign) => Number(sign.groupId) === Number(group.id));
  const playable = members.filter(isPracticeReadySign).length;
  const countText = playable === members.length ? `${members.length}サイン` : `${members.length}サイン · ${playable}サイン練習可`;
  const video = group.videoId ? `<div class="group-review-video"><iframe src="https://www.youtube-nocookie.com/embed/${encodeURIComponent(group.videoId)}?playsinline=1&rel=0&controls=1" title="${escapeHtml(group.name)}の説明動画" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div>` : "";
  layer.innerHTML = `<div class="group-review-backdrop" data-group-review-close></div><section class="group-review-card" role="dialog" aria-modal="true" aria-labelledby="group-review-title"><button class="group-review-close" data-group-review-close type="button" aria-label="閉じる">×</button><p class="practice-groups-kicker">GROUP GUIDE</p><h2 id="group-review-title">${escapeHtml(group.name)}</h2><p class="group-review-count">${escapeHtml(countText)}</p>${video}${group.description ? `<p class="group-review-description">${escapeHtml(group.description)}</p>` : `<p class="group-review-description group-review-description--muted">説明文は登録されていません。</p>`}<button class="button button-primary button-full" id="group-review-practice" type="button" ${playable ? "" : "disabled"}>${playable ? "このグループで練習する" : "練習できる動画がありません"}</button></section>`;
  document.body.appendChild(layer);
  const close = () => layer.remove();
  layer.querySelectorAll("[data-group-review-close]").forEach((el) => el.addEventListener("click", close));
  layer.querySelector("#group-review-practice")?.addEventListener("click", () => { if (!playable) return; close(); selectPracticeGroup(Number(group.id)); });
}

function renderPracticeSetup() {
  document.title = "サイン練習 | SIGN TRAINER";
  const history = getPracticeHistory();
  const latest = history[0];
  const historySub = latest
    ? `前回 ${latest.correct}/${latest.total}問正解 · ${formatHistoryDate(latest.completedAt, { short: true })}`
    : "練習すると、この端末に結果が残ります";

  const hasGroups = state.groups.length > 0;
  const selectedGroup = selectedPracticeGroup();
  const isSelectingGroup = hasGroups && !selectedGroup;
  const practiceSigns = selectedGroup ? currentPracticeSigns() : [];
  const playableSigns = practiceSigns.filter(isPracticeReadySign);
  const practiceOptions = selectedGroup ? getPracticeOptions(playableSigns.length) : [];
  const hasMultipleVideoSigns = state.signs.some((sign) => Array.isArray(sign?.videos) && sign.videos.length > 1);
  const choicesHtml = practiceOptions.length
    ? practiceOptions.map((option) => `<button class="choice${option.recommended ? " recommended" : ""}" data-count="${option.count}" type="button"><span class="choice-copy"><span class="choice-main">${escapeHtml(option.main)}</span><span class="choice-sub">${escapeHtml(option.sub)}</span></span>${option.badge ? `<span class="choice-badge">${escapeHtml(option.badge)}</span>` : `<span class="choice-arrow">${icons.arrow}</span>`}</button>`).join("")
    : selectedGroup ? `<div class="practice-empty-notice" role="status"><strong>このグループには練習できる動画がありません</strong><span>別のグループを選ぶか、チーム管理者に動画の登録を依頼してください。</span></div>` : "";

  const mainFlow = isSelectingGroup
    ? renderGroupSelection()
    : `<section class="practice-step practice-step--count">
        ${renderSelectedGroupSummary(selectedGroup || { name: "すべてのサイン", id: "all" }, practiceSigns.length, playableSigns.length, hasGroups)}
        <div class="practice-step-label"><span>STEP 2</span><strong>問題数を選ぶ</strong></div>
        <div class="practice-step-heading"><h2>何問練習しますか？</h2><p>${escapeHtml(selectedGroup?.name || "すべてのサイン")}から出題します。</p></div>
        <div class="choice-list">${choicesHtml}</div>
      </section>`;

  app.innerHTML = `<div class="app-bg">
    ${appTopbar()}
    <main class="app-main practice-main">
      <section class="app-panel is-compact practice-setup-panel">
        ${practiceTeamIdentity()}
        <h1>サイン練習</h1>
        <p class="panel-lead">動画を見て、何のサインか答えよう！</p>
        ${mainFlow}
        <button class="history-entry-button" id="open-history" type="button">
          <span class="history-entry-icon">${icons.clock}</span>
          <span class="history-entry-copy"><strong>練習履歴を見る</strong><span>${escapeHtml(historySub)}</span></span>
          ${history.length ? `<span class="history-entry-count">${history.length}件</span>` : `<span class="history-entry-arrow">›</span>`}
        </button>
        <button class="share-entry-button" id="open-team-share" type="button">
          <span class="share-entry-icon">${icons.share}</span>
          <span class="share-entry-copy"><strong>チームメンバーに共有</strong><span>参加リンク・QRコード・LINEでこの練習ページを共有</span></span>
          <span class="history-entry-arrow">›</span>
        </button>
        <div class="practice-points" aria-label="練習のポイント">
          <div class="practice-point">${icons.check}<span>今日使うグループを選ぶ</span></div>
          <div class="practice-point">${icons.check}<span>説明を確認してから動画クイズへ</span></div>
          <div class="practice-point">${icons.check}<span>間違えた問題だけもう一度練習</span></div>
          ${hasMultipleVideoSigns ? `<div class="practice-point">${icons.check}<span>同じサインの複数動画は、偏りを抑えて順番に経験</span></div>` : ""}
        </div>
        <button class="logout-link" id="logout" type="button">この端末の認証を解除</button>
      </section>
    </main>
  </div>`;

  document.querySelectorAll("[data-choose-group]").forEach((button) => button.addEventListener("click", () => {
    if (button.disabled) return;
    selectPracticeGroup(button.dataset.chooseGroup === "all" ? "all" : Number(button.dataset.chooseGroup));
  }));
  document.querySelectorAll("[data-review-group]").forEach((button) => button.addEventListener("click", () => {
    const group = state.groups.find((item) => String(item.id) === String(button.dataset.reviewGroup));
    if (group) openGroupReview(group);
  }));
  document.querySelector("#change-practice-group")?.addEventListener("click", () => {
    state.activeGroupId = hasGroups ? null : "all";
    renderPracticeSetup();
  });
  document.querySelector("[data-review-selected]")?.addEventListener("click", () => {
    const group = selectedPracticeGroup();
    if (group && group.id !== "all") openGroupReview(group);
  });
  document.querySelectorAll("[data-count]").forEach((button) => {
    button.addEventListener("click", () => {
      const count = button.dataset.count === "all" ? "all" : Number(button.dataset.count);
      startQuiz(count, currentPracticeSigns());
    });
  });
  document.querySelector("#open-history")?.addEventListener("click", () => navigate(`${activeTeamPath()}?view=history`));
  initShareDialog();
  document.querySelector("#open-team-share")?.addEventListener("click", () => { void openShareDialog("team"); });
  document.querySelector("#logout")?.addEventListener("click", confirmLogout);
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
  state.groups = [];
  state.plan = null;
  state.entitlements = {};
  state.activeGroupId = null;
  state.deck = [];
  state.results = [];
  renderAuth();
}

function startQuiz(count, sourceSigns = state.signs, { review = false } = {}) {
  const availableSigns = (sourceSigns || []).filter((sign) => Array.isArray(sign?.videos) && sign.videos.length > 0);
  if (!availableSigns.length) {
    renderAppError("練習するサインがありません", "チーム管理者がサイン名とYouTube動画を登録してください。", renderPracticeSetup);
    return;
  }
  const requestedCount = count === "all" ? availableSigns.length : Math.max(1, Number(count) || 1);
  const targetCount = Math.min(requestedCount, availableSigns.length);
  state.deck = buildDeck(availableSigns, targetCount);
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
  const availableSigns = (signs || []).filter((sign) => Array.isArray(sign?.videos) && sign.videos.length > 0);
  const safeCount = Math.min(Math.max(0, Number(count) || 0), availableSigns.length);
  return shuffle([...availableSigns])
    .slice(0, safeCount)
    .map((sign) => ({ ...sign, videoId: chooseBalancedVideo(sign) }));
}

function chooseBalancedVideo(sign) {
  const videos = Array.isArray(sign?.videos) ? [...new Set(sign.videos.filter(Boolean))] : [];
  if (videos.length <= 1) return videos[0] || "";
  const usage = new Map(videos.map((videoId) => [videoId, { count: 0, lastSeenAt: 0 }]));
  for (const entry of getPracticeHistory()) {
    for (const result of (entry.results || [])) {
      if (String(result.id) !== String(sign.id) || !usage.has(result.videoId)) continue;
      const stats = usage.get(result.videoId);
      stats.count += 1;
      stats.lastSeenAt = Math.max(stats.lastSeenAt, Number(entry.completedAt || entry.startedAt || 0));
    }
  }
  const ranked = videos.map((videoId) => ({ videoId, ...usage.get(videoId) }))
    .sort((a, b) => a.count - b.count || a.lastSeenAt - b.lastSeenAt);
  const best = ranked[0];
  const candidates = ranked.filter((item) => item.count === best.count && item.lastSeenAt === best.lastSeenAt);
  return randomItem(candidates).videoId;
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

function percentageClass(value) {
  const percent = Math.max(0, Math.min(100, Math.round(Number(value) || 0)));
  return `pct-${percent}`;
}

function setProgress(percent) {
  const progress = document.querySelector("#quiz-progress-bar");
  if (!progress) return;
  for (const name of [...progress.classList]) {
    if (/^pct-\d+$/.test(name)) progress.classList.remove(name);
  }
  progress.classList.add(percentageClass(percent));
}

function buildYouTubeEmbedUrl(videoId) {
  const id = String(videoId || "").trim();
  if (!/^[A-Za-z0-9_-]{6,20}$/.test(id)) {
    throw new Error(`invalid youtube video id: ${id}`);
  }

  const params = new URLSearchParams({
    autoplay: "1",
    mute: "1",
    playsinline: "1",
    controls: "0",
    disablekb: "1",
    fs: "0",
    iv_load_policy: "3",
    rel: "0",
    hl: "ja",
    enablejsapi: "1",
    origin: window.location.origin
  });

  // iPhone/Safariでも問題表示と同時にプレイヤーをロードする。
  // 音声付き自動再生はiOSでブロックされるため、最初はmute=1で再生を試す。
  // Shorts も通常動画も埋め込み時は同じ /embed/{videoId} を使う。
  return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}?${params.toString()}`;
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
  iframe.allow = "accelerometer; autoplay; encrypted-media; gyroscope";
  iframe.referrerPolicy = "strict-origin-when-cross-origin";
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

  // Safari/iOSではiframeのloadイベントがユーザー操作後まで遅れる場合がある。
  // プレイヤー自体は既に挿入済みなので、短時間で独自ローディング表示を外し、
  // YouTube側のプレイヤー/サムネイルを直接見せる。
  window.setTimeout(() => {
    if (state.player !== iframe) return;
    cover.hidden = true;
    cover.classList.add("is-hidden");
    // iOSではiframeのloadイベントが遅延することがあるため、
    // ここで「プレイヤーは画面に出せる状態」とみなし、誤タイムアウトを防ぐ。
    if (!state.playerReady) {
      state.playerReady = true;
      clearTimeout(state.videoLoadTimer);
      state.videoLoadTimer = null;
    }
  }, 450);
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
  const celebration = getResultCelebration(rate, totalQuestions);
  const message = celebration.message;
  saveCurrentPracticeResult({ correct, wrong, skipped, totalQuestions, rate, seconds });
  document.title = `${title} | SIGN TRAINER`;

  app.innerHTML = `<div class="app-bg">
    ${appTopbar()}
    <main class="app-main">
      <section class="app-panel result-panel result-panel--${celebration.level}">
        <div class="result-title"><span class="result-badge">${celebration.badge}</span><h1>${title}</h1><p>${message}</p></div>
        <div class="result-score result-score--${celebration.level} ${percentageClass(rate)}" id="result-score"><div class="result-score-inner"><div class="result-score-big">${correct}<small> / ${totalQuestions || 0}問</small></div><span class="result-score-small">正答率 ${totalQuestions ? `${rate}%` : "—"}</span></div></div>
        <div class="result-stats">
          <div class="result-stat"><strong>${correct}</strong><span>正解</span></div>
          <div class="result-stat"><strong>${wrong}</strong><span>不正解</span></div>
          <div class="result-stat"><strong>${formatDuration(seconds)}</strong><span>時間${skipped ? `<br>${skipped}問スキップ` : ""}</span></div>
        </div>
        <div class="mistake-summary"><h3>${mistakes.length ? `間違えたサイン：${mistakes.length}種類` : "間違えたサインはありません"}</h3><p>${mistakes.length ? mistakes.map((sign) => escapeHtml(sign.name)).join("・") : "このセットはしっかり確認できました。"}</p></div>
        <div class="result-actions">
          ${mistakes.length ? `<button class="button button-primary button-full" id="review-mistakes" type="button">間違えた${mistakes.length}問をもう一度</button>` : ""}
          <button class="button button-secondary button-full" id="retry-practice" type="button">${state.reviewMode ? `同じ${totalQuestions}問をもう一度` : state.practiceMode === "all" ? `もう一度全サイン（${totalQuestions}問）` : `もう一度${totalQuestions}問`}</button>
          <button class="result-text-button" id="back-setup" type="button">問題数を選び直す</button>
        </div>
      </section>
    </main>
  </div>`;

  runResultCelebration(celebration);
  if (mistakes.length) document.querySelector("#review-mistakes").addEventListener("click", () => renderMistakeReview(mistakes));
  document.querySelector("#retry-practice").addEventListener("click", () => {
    if (state.reviewMode) {
      startQuiz(totalQuestions, state.deck, { review: true });
    } else if (state.practiceMode === "all") {
      startQuiz("all");
    } else {
      startQuiz(totalQuestions);
    }
  });
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
  iframe.allow = "accelerometer; autoplay; encrypted-media; gyroscope";
  iframe.referrerPolicy = "strict-origin-when-cross-origin";
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

  window.setTimeout(() => {
    if (state.player !== iframe) return;
    cover.hidden = true;
    cover.classList.add("is-hidden");
    // iOSではiframeのloadイベントが遅延することがあるため、
    // ここで「プレイヤーは画面に出せる状態」とみなし、誤タイムアウトを防ぐ。
    if (!state.playerReady) {
      state.playerReady = true;
      clearTimeout(state.videoLoadTimer);
      state.videoLoadTimer = null;
    }
  }, 450);
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
    const raw = localStorage.getItem(historyKey());
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
    localStorage.setItem(historyKey(), JSON.stringify(history.slice(0, HISTORY_LIMIT)));
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
    teamId: activeTeamId,
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
      groupId: result.sign.groupId ?? null,
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

function practiceAnalyticsEnabled() {
  return Boolean(state.entitlements?.practice_analytics?.enabled);
}

function analyticsRate(correct, attempts) {
  return attempts ? Math.round((correct / attempts) * 100) : 0;
}

function videoPatternLabel(signId, videoId) {
  const sign = state.signs.find((item) => String(item.id) === String(signId));
  const index = sign?.videos?.findIndex((id) => id === videoId) ?? -1;
  return index >= 0 ? `動画${index + 1}` : "動画パターン";
}

function collectPracticeAnalytics(history = getPracticeHistory()) {
  const signById = new Map(state.signs.map((sign) => [String(sign.id), sign]));
  const groupById = new Map(state.groups.map((group) => [String(group.id), group]));
  const groups = new Map();
  const signs = new Map();
  const videos = new Map();
  const chronologicalGrades = [];
  let attempts = 0;
  let correct = 0;

  const bump = (map, key, seed, grade, completedAt) => {
    if (!map.has(key)) map.set(key, { ...seed, attempts: 0, correct: 0, grades: [], lastAt: 0 });
    const row = map.get(key);
    row.attempts += 1;
    if (grade === "correct") row.correct += 1;
    row.grades.push(grade);
    row.lastAt = Math.max(row.lastAt, Number(completedAt || 0));
    return row;
  };

  for (const entry of history) {
    for (const result of (entry.results || [])) {
      if (result.grade !== "correct" && result.grade !== "wrong") continue;
      attempts += 1;
      if (result.grade === "correct") correct += 1;
      chronologicalGrades.push(result.grade);
      const signId = String(result.id);
      const currentSign = signById.get(signId);
      const groupIdValue = result.groupId ?? currentSign?.groupId ?? null;
      const groupKey = groupIdValue == null ? "ungrouped" : String(groupIdValue);
      const groupName = groupKey === "ungrouped" ? "未分類" : (groupById.get(groupKey)?.name || `グループ ${groupKey}`);
      bump(groups, groupKey, { id: groupIdValue, name: groupName }, result.grade, entry.completedAt);
      bump(signs, signId, { id: result.id, name: result.name || currentSign?.name || `サイン ${signId}`, groupId: groupIdValue, groupName }, result.grade, entry.completedAt);
      if (result.videoId) {
        const key = `${signId}:${result.videoId}`;
        bump(videos, key, { signId: result.id, signName: result.name || currentSign?.name || `サイン ${signId}`, videoId: result.videoId, label: videoPatternLabel(result.id, result.videoId) }, result.grade, entry.completedAt);
      }
    }
  }

  const finish = (rows) => [...rows.values()].map((row) => {
    const recent = row.grades.slice(0, 10);
    const recentCorrect = recent.filter((grade) => grade === "correct").length;
    return { ...row, rate: analyticsRate(row.correct, row.attempts), recentRate: analyticsRate(recentCorrect, recent.length), recentAttempts: recent.length };
  });
  const signRows = finish(signs).sort((a, b) => a.rate - b.rate || b.attempts - a.attempts || a.name.localeCompare(b.name, "ja"));
  const groupRows = finish(groups).sort((a, b) => a.rate - b.rate || b.attempts - a.attempts);
  const allVideoRows = finish(videos);
  const videoPatternCounts = new Map();
  allVideoRows.forEach((row) => videoPatternCounts.set(String(row.signId), Number(videoPatternCounts.get(String(row.signId)) || 0) + 1));
  const videoRows = allVideoRows.filter((row) => {
    const sign = signById.get(String(row.signId));
    return (sign?.videos?.length || 0) > 1 || Number(videoPatternCounts.get(String(row.signId)) || 0) > 1;
  }).sort((a, b) => a.rate - b.rate || b.attempts - a.attempts);
  const weakSigns = signRows.filter((row) => row.attempts >= 3).slice(0, 5);
  const recent = chronologicalGrades.slice(0, 10);
  return {
    attempts,
    correct,
    rate: analyticsRate(correct, attempts),
    recentRate: analyticsRate(recent.filter((grade) => grade === "correct").length, recent.length),
    recentAttempts: recent.length,
    groupRows,
    signRows,
    videoRows,
    weakSigns
  };
}

function analyticsBar(row, { label = row.name, meta = "" } = {}) {
  return `<div class="practice-analytics-row"><div class="practice-analytics-row-head"><div><strong>${escapeHtml(label)}</strong>${meta ? `<small>${escapeHtml(meta)}</small>` : ""}</div><span><b>${row.rate}%</b><small>${row.correct}/${row.attempts}</small></span></div><div class="practice-analytics-bar"><span class="practice-analytics-bar-fill ${percentageClass(row.rate)}"></span></div>${row.recentAttempts ? `<p>直近${row.recentAttempts}回 ${row.recentRate}%</p>` : ""}</div>`;
}

function renderPracticeAnalyticsSummary(history) {
  if (!practiceAnalyticsEnabled()) {
    return `<section class="practice-analytics practice-analytics--summary practice-analytics--locked"><div class="practice-analytics-lock">${icons.lock}</div><div><span class="practice-analytics-kicker">PRO FEATURE</span><h2>正答率・苦手分析</h2><p>Proでは練習履歴から、苦手なサインやグループを見つけられます。</p><button class="button button-secondary" id="history-open-analytics" type="button">機能を見る</button></div></section>`;
  }
  const stats = collectPracticeAnalytics(history);
  if (!stats.attempts) {
    return `<section class="practice-analytics practice-analytics--summary"><div class="practice-analytics-heading"><div><span class="practice-analytics-kicker">ANALYTICS</span><h2>成績サマリー</h2><p>練習すると、ここに正答率と苦手サインが表示されます。</p></div><button class="button button-secondary" id="history-open-analytics" type="button">詳しい分析を見る</button></div></section>`;
  }
  const weak = stats.weakSigns.slice(0, 3);
  return `<section class="practice-analytics practice-analytics--summary"><div class="practice-analytics-heading"><div><span class="practice-analytics-kicker">ANALYTICS</span><h2>成績サマリー</h2><p>ざっと確認して、詳しい分析は専用ページで見られます。</p></div><button class="button button-secondary" id="history-open-analytics" type="button">詳しい分析を見る</button></div>
    <div class="practice-analytics-summary practice-analytics-summary--compact"><div class="practice-analytics-summary-stat"><strong>${stats.rate}%</strong><span>累計正答率</span></div><div class="practice-analytics-summary-stat"><strong>${stats.recentRate}%</strong><span>直近${stats.recentAttempts}回答</span></div><div class="practice-analytics-summary-stat"><strong>${stats.attempts}</strong><span>総回答数</span></div></div>
    <div class="practice-analytics-weak-summary"><div class="practice-analytics-section-head"><h3>苦手サイン</h3><span>3回答以上・上位3件</span></div>${weak.length ? weak.map((row) => analyticsBar(row, { meta: `${row.groupName} · ${row.attempts}回答` })).join("") : `<p class="practice-analytics-empty">もう少し練習すると苦手傾向を表示します。</p>`}</div>
  </section>`;
}

function renderPracticeAnalyticsDetail(history) {
  if (!practiceAnalyticsEnabled()) {
    return `<section class="practice-analytics practice-analytics--locked"><div class="practice-analytics-lock">${icons.lock}</div><div><span class="practice-analytics-kicker">PRO FEATURE</span><h2>正答率・苦手分析</h2><p>Proではサイングループ・サイン・動画パターンごとの正答率をグラフで確認し、苦手なサインだけ練習できます。</p><strong>Plus / Proは現在、特定チーム限定で提供しています。一般のお申し込み・オンライン課金にはまだ対応していません。</strong></div></section>`;
  }
  const stats = collectPracticeAnalytics(history);
  if (!stats.attempts) {
    return `<section class="practice-analytics"><div class="practice-analytics-heading"><div><span class="practice-analytics-kicker">ANALYTICS</span><h2>正答率・苦手分析</h2></div></div><div class="history-empty history-empty--compact"><h3>分析できる回答がまだありません</h3><p>練習をすると、グループ・サイン・動画パターン別の正答率がここに表示されます。</p></div></section>`;
  }
  const weakIds = stats.weakSigns.map((row) => String(row.id)).join(",");
  const groupHtml = stats.groupRows.length ? stats.groupRows.map((row) => analyticsBar(row)).join("") : `<p class="practice-analytics-empty">グループ別データはまだありません。</p>`;
  const signHtml = stats.signRows.length ? stats.signRows.slice(0, 12).map((row) => analyticsBar(row, { meta: `${row.groupName} · ${row.attempts}回答` })).join("") : "";
  const videoHtml = stats.videoRows.length ? stats.videoRows.slice(0, 12).map((row) => analyticsBar(row, { label: `${row.signName} / ${row.label}`, meta: `${row.attempts}回答` })).join("") : `<p class="practice-analytics-empty">複数動画の回答データがたまると、動画パターン別の苦手も表示します。</p>`;
  const weakHtml = stats.weakSigns.length ? stats.weakSigns.map((row) => analyticsBar(row, { meta: `${row.groupName} · ${row.attempts}回答` })).join("") : `<p class="practice-analytics-empty">苦手判定は3回答以上のサインを対象にします。もう少し練習すると表示されます。</p>`;
  return `<section class="practice-analytics"><div class="practice-analytics-heading"><div><span class="practice-analytics-kicker">ANALYTICS</span><h2>正答率・苦手分析</h2><p>累計と直近の成績を見比べて、いま取り組むべきサインを見つけます。</p></div>${stats.weakSigns.length ? `<button class="button button-primary" id="history-practice-weak" data-weak-sign-ids="${escapeHtml(weakIds)}" type="button">苦手なサインを練習</button>` : ""}</div>
    <div class="practice-analytics-summary"><div class="practice-analytics-ring ${percentageClass(stats.rate)}"><svg viewBox="0 0 42 42" aria-hidden="true"><circle cx="21" cy="21" r="15.9" pathLength="100"></circle><circle class="practice-analytics-ring-value" cx="21" cy="21" r="15.9" pathLength="100" stroke-dasharray="${stats.rate} 100"></circle></svg><div><strong>${stats.rate}%</strong><span>累計正答率</span></div></div><div class="practice-analytics-summary-stat"><strong>${stats.correct}<small> / ${stats.attempts}</small></strong><span>正解 / 回答</span></div><div class="practice-analytics-summary-stat"><strong>${stats.recentRate}%</strong><span>直近${stats.recentAttempts}回答</span></div></div>
    <div class="practice-analytics-grid"><section><div class="practice-analytics-section-head"><h3>サイングループ別</h3><span>正答率</span></div>${groupHtml}</section><section><div class="practice-analytics-section-head"><h3>苦手なサイン</h3><span>3回答以上</span></div>${weakHtml}</section></div>
    <div class="practice-analytics-grid practice-analytics-grid--detail"><section><div class="practice-analytics-section-head"><h3>サイン別</h3><span>苦手順</span></div>${signHtml}</section><section><div class="practice-analytics-section-head"><h3>動画パターン別</h3><span>複数動画</span></div>${videoHtml}</section></div>
    <p class="practice-analytics-note">複数動画があるサインは、同じ動画に偏りすぎないよう、これまでの出題回数と最終出題時刻を見て出題します。</p>
  </section>`;
}

function renderPracticeAnalyticsPage() {
  cleanupPlayer();
  const history = getPracticeHistory();
  document.title = "成績分析 | SIGN TRAINER";
  app.innerHTML = `<div class="app-bg">
    ${appTopbar('<button class="button button-ghost" id="analytics-back" type="button">履歴へ</button>')}
    <main class="app-main practice-main">
      <section class="app-panel history-panel analytics-detail-panel">
        ${practiceTeamIdentity()}
        <div class="history-heading"><div><h1>成績分析</h1><p class="panel-lead">サイングループ・サイン・動画パターンごとの正答率から、苦手を見つけて練習できます。</p></div></div>
        ${renderPracticeAnalyticsDetail(history)}
        <div class="result-actions"><button class="button button-secondary button-full" id="analytics-history" type="button">練習履歴を見る</button><button class="button button-primary button-full" id="analytics-practice" type="button">練習をはじめる</button></div>
      </section>
    </main>
  </div>`;
  document.querySelector("#analytics-back")?.addEventListener("click", () => navigate(`${activeTeamPath()}?view=history`));
  document.querySelector("#analytics-history")?.addEventListener("click", () => navigate(`${activeTeamPath()}?view=history`));
  document.querySelector("#analytics-practice")?.addEventListener("click", () => navigate(activeTeamPath()));
  document.querySelector("#history-practice-weak")?.addEventListener("click", (event) => {
    const ids = String((event.currentTarget as HTMLElement).dataset.weakSignIds || "").split(",").filter(Boolean);
    const weakSigns = state.signs.filter((sign) => ids.includes(String(sign.id)));
    if (weakSigns.length) startQuiz(weakSigns.length, weakSigns, { review: true });
  });
}

function renderPracticeHistory() {
  cleanupPlayer();
  const history = getPracticeHistory();
  const pageSize = 10;
  const totalPages = Math.max(1, Math.ceil(history.length / pageSize));
  document.title = "練習履歴 | SIGN TRAINER";
  app.innerHTML = `<div class="app-bg">
    ${appTopbar('<button class="button button-ghost" id="history-back" type="button">戻る</button>')}
    <main class="app-main practice-main">
      <section class="app-panel history-panel">
        ${practiceTeamIdentity()}
        <div class="history-heading"><div><h1>練習履歴</h1><p class="panel-lead">この端末で行った練習結果を確認できます。</p></div>${history.length ? `<strong class="history-total-count">全${history.length}件</strong>` : ""}</div>
        ${renderPracticeAnalyticsSummary(history)}
        ${history.length ? `<div class="history-list" data-history-list>
          ${history.map((entry, index) => {
            const mistakes = getHistoryMistakeResults(entry);
            const names = [...new Set(mistakes.map((item) => item.name))];
            return `<button class="history-card" data-history-id="${escapeHtml(entry.id)}" data-history-index="${index}" type="button">
              <span class="history-card-top"><span class="history-date">${escapeHtml(formatHistoryDate(entry.completedAt))}</span><span class="history-mode">${escapeHtml(historyModeLabel(entry))}</span></span>
              <span class="history-card-main"><strong>${entry.correct}<small> / ${entry.total}問</small></strong><span class="history-rate">正答率 ${entry.rate}%</span><span class="history-chevron">›</span></span>
              <span class="history-card-meta">${formatDuration(entry.durationSeconds || 0)}${entry.skipped ? ` · ${entry.skipped}問スキップ` : ""}</span>
              <span class="history-card-mistakes">${names.length ? `間違い：${escapeHtml(names.slice(0, 3).join("・"))}${names.length > 3 ? ` ほか${names.length - 3}件` : ""}` : "間違いなし"}</span>
            </button>`;
          }).join("")}
        </div><nav class="history-pagination" data-history-pagination aria-label="練習履歴のページ切り替え" ${history.length <= pageSize ? "hidden" : ""}><button class="button button-secondary" id="history-prev" type="button">‹ 前へ</button><span><b id="history-page-current">1</b> / ${totalPages}ページ</span><button class="button button-secondary" id="history-next" type="button">次へ ›</button></nav>` : `<div class="history-empty"><div class="history-empty-icon">${icons.clock}</div><h2>まだ練習履歴はありません</h2><p>練習を最後まで終えると、結果がここに自動で保存されます。</p></div>`}
        <div class="result-actions"><button class="button button-primary button-full" id="history-start" type="button">練習をはじめる</button></div>
      </section>
    </main>
  </div>`;

  let page = 1;
  const renderHistoryPage = (scroll = false) => {
    const cards = [...document.querySelectorAll<HTMLElement>("[data-history-index]")];
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    cards.forEach((card) => {
      const index = Number(card.dataset.historyIndex || 0);
      card.hidden = index < start || index >= end;
    });
    const current = document.querySelector<HTMLElement>("#history-page-current");
    if (current) current.textContent = String(page);
    const prev = document.querySelector<HTMLButtonElement>("#history-prev");
    const next = document.querySelector<HTMLButtonElement>("#history-next");
    if (prev) prev.disabled = page <= 1;
    if (next) next.disabled = page >= totalPages;
    if (scroll) document.querySelector(".history-panel")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  renderHistoryPage();
  document.querySelector("#history-open-analytics")?.addEventListener("click", () => navigate(`${activeTeamPath()}?view=analytics`));
  document.querySelector("#history-prev")?.addEventListener("click", () => { if (page <= 1) return; page -= 1; renderHistoryPage(true); });
  document.querySelector("#history-next")?.addEventListener("click", () => { if (page >= totalPages) return; page += 1; renderHistoryPage(true); });
  document.querySelector("#history-back")?.addEventListener("click", () => navigate(activeTeamPath()));
  document.querySelector("#history-start")?.addEventListener("click", () => navigate(activeTeamPath()));
  document.querySelector("#history-practice-weak")?.addEventListener("click", (event) => {
    const ids = new Set(String((event.currentTarget as HTMLElement).dataset.weakSignIds || "").split(",").filter(Boolean));
    const weakSigns = state.signs.filter((sign) => ids.has(String(sign.id)) && isPracticeReadySign(sign));
    if (weakSigns.length) startQuiz("all", weakSigns);
  });
  document.querySelectorAll("[data-history-id]").forEach((button) => {
    button.addEventListener("click", () => renderPracticeHistoryDetail((button as HTMLElement).dataset.historyId));
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
    <main class="app-main practice-main">
      <section class="app-panel result-panel history-detail-panel">
        ${practiceTeamIdentity()}
        <div class="result-title"><h1>${escapeHtml(historyModeLabel(entry))}の結果</h1><p>${escapeHtml(formatHistoryDate(entry.completedAt))}</p></div>
        <div class="result-score ${percentageClass(entry.rate || 0)}" id="history-result-score"><div class="result-score-inner"><div class="result-score-big">${entry.correct}<small> / ${entry.total}問</small></div><span class="result-score-small">正答率 ${entry.rate}%</span></div></div>
        <div class="result-stats">
          <div class="result-stat"><strong>${entry.correct}</strong><span>正解</span></div>
          <div class="result-stat"><strong>${entry.wrong}</strong><span>不正解</span></div>
          <div class="result-stat"><strong>${formatDuration(entry.durationSeconds || 0)}</strong><span>練習時間${entry.skipped ? `<br>${entry.skipped}問スキップ` : ""}</span></div>
        </div>
        <div class="history-answer-list">
          ${(entry.results || []).map((result, index) => {
            const status = result.grade === "correct" ? "○" : result.grade === "wrong" ? "×" : "—";
            const label = result.grade === "correct" ? "正解" : result.grade === "wrong" ? "不正解" : "スキップ";
            return `<div class="history-answer-row is-${escapeHtml(result.grade)}"><span class="history-answer-no">${index + 1}</span><span class="history-answer-name">${escapeHtml(result.name)}${result.videoId ? `<small>${escapeHtml(videoPatternLabel(result.id, result.videoId))}</small>` : ""}</span><span class="history-answer-status"><b>${status}</b>${label}</span></div>`;
          }).join("")}
        </div>
        <div class="result-actions">
          ${mistakes.length ? `<button class="button button-primary button-full" id="history-review" type="button">間違えた${mistakes.length}問を練習する</button>` : ""}
          <button class="button button-secondary button-full" id="history-retry" type="button">もう一度${entry.mode === "all" ? `全サイン（現在${state.signs.length}問）` : `${Math.min(Math.max(1, entry.total || 1), Math.max(1, state.signs.length))}問`}</button>
          <button class="result-text-button" id="history-detail-back-bottom" type="button">練習履歴に戻る</button>
        </div>
      </section>
    </main>
  </div>`;
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


function renderPracticeEmptyState() {
  document.title = `準備中 | ${state.teamName} | SIGN TRAINER`;
  app.innerHTML = `<div class="app-bg">
    ${appTopbar()}
    <main class="app-main">
      <section class="app-panel practice-empty-state-panel" role="status">
        <div class="practice-empty-state-mark" aria-hidden="true"><span></span><span></span><span></span></div>
        <p class="practice-empty-state-kicker">${escapeHtml(state.teamName)}</p>
        <h2>まだ練習データがありません</h2>
        <p class="practice-empty-state-lead">管理者がサインを登録すると、ここから練習できるようになります。<br>準備ができるまで、もう少しお待ちください。</p>
        <div class="practice-empty-state-note"><strong>チーム管理者のみなさんへ</strong><span>チーム管理の「サイン管理」からサインと練習動画を登録してください。</span></div>
        <div class="result-actions practice-empty-state-actions"><button class="button button-primary button-full" id="practice-empty-refresh" type="button">登録状況を確認する</button><a class="button button-secondary button-full" href="/" data-nav>トップページへ</a></div>
      </section>
    </main>
  </div>`;
  document.querySelector("#practice-empty-refresh")?.addEventListener("click", async () => {
    renderLoading("練習データを確認しています…", "管理者が登録した最新データを確認します。");
    if (await loadSigns()) renderPracticeSetup();
  });
}

function renderAppError(title, message, retry) {
  app.innerHTML = `<div class="app-bg">${appTopbar()}<main class="app-main"><section class="app-panel error-panel"><div class="error-symbol">!</div><h2>${escapeHtml(title)}</h2><p>${escapeHtml(message)}</p><div class="result-actions"><button class="button button-primary button-full" id="retry-app" type="button">もう一度試す</button></div></section></main></div>`;
  document.querySelector("#retry-app").addEventListener("click", retry);
}

function renderClientNotFound() {
  document.title = "ページが見つかりません | SIGN TRAINER";
  app.innerHTML = `<div class="app-bg">${appTopbar()}<main class="app-main"><section class="app-panel error-panel"><div class="error-symbol">?</div><h2>ページが見つかりません</h2><p>URLが正しいか確認してください。</p><div class="result-actions"><a class="button button-primary button-full" href="/" data-nav>トップページへ</a></div></section></main></div>`;
}

route();
