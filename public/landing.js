import { lineShareUrl, qrImageUrl, teamUrl, topUrl } from "./share-utils.js?v=77";

const APP_BUILD = "77";
const TERMS_VERSION = "2026-09-25";
const PRIVACY_VERSION = "2026-09-25";
console.info(`[SIGN TRAINER] build ${APP_BUILD} landing`);

const SAMPLE_TEAM_ID = "6BnWv2K3zo";
const shareDialog = document.querySelector("#share-dialog");

const registerDialog = document.querySelector("#team-register-dialog");

function updateRegistrationButtons() {
  if (!registerDialog) return;
  const consent = Boolean(registerDialog.querySelector("#register-legal-consent")?.checked);
  for (const id of ["#register-google", "#register-line"]) {
    const link = registerDialog.querySelector(id);
    if (!link) continue;
    const enabled = link.dataset.providerEnabled === "true" && consent;
    link.classList.toggle("is-disabled", !enabled);
    link.setAttribute("aria-disabled", enabled ? "false" : "true");
    if (enabled) {
      const base = link.dataset.oauthBase || "";
      const separator = base.includes("?") ? "&" : "?";
      link.href = `${base}${separator}terms=${encodeURIComponent(TERMS_VERSION)}&privacy=${encodeURIComponent(PRIVACY_VERSION)}`;
    } else {
      link.removeAttribute("href");
    }
  }
}

async function loadRegistrationProviders() {
  if (!registerDialog) return;
  const status = registerDialog.querySelector("#team-register-provider-status");
  try {
    const response = await fetch("/api/account/providers", { cache: "no-store" });
    const data = await response.json().catch(() => ({}));
    const providers = data.providers || {};
    for (const [provider, id] of [["google", "#register-google"], ["line", "#register-line"]]) {
      const link = registerDialog.querySelector(id);
      if (!link) continue;
      const enabled = Boolean(providers[provider]);
      link.dataset.providerEnabled = enabled ? "true" : "false";
    }
    if (!providers.google || !providers.line) {
      if (status) status.innerHTML = `<div class="notice notice-warning">現在利用できない認証方法があります。運営側のOAuth設定後に有効になります。</div>`;
    } else if (status) status.innerHTML = "";
    updateRegistrationButtons();
  } catch {
    if (status) status.innerHTML = `<div class="notice notice-error">認証方法を確認できませんでした。もう一度お試しください。</div>`;
  }
}

async function openRegistrationDialog() {
  try {
    const response = await fetch("/api/account/session", { cache: "no-store" });
    const data = await response.json().catch(() => ({}));
    if (data.authenticated) {
      location.href = "/account?create=1";
      return;
    }
  } catch {
    // Fall back to the provider chooser when account state cannot be loaded.
  }
  if (!registerDialog) {
    location.href = "/account?create=1";
    return;
  }
  const consent = registerDialog.querySelector("#register-legal-consent");
  if (consent) consent.checked = false;
  await loadRegistrationProviders();
  updateRegistrationButtons();
  if (registerDialog.showModal) registerDialog.showModal();
  else registerDialog.setAttribute("open", "");
}

function initRegistrationDialog() {
  document.querySelectorAll("[data-open-register]").forEach((button) => button.addEventListener("click", () => {
    document.querySelector("#mobile-nav")?.classList.remove("is-open");
    openRegistrationDialog();
  }));
  registerDialog?.querySelector("#register-legal-consent")?.addEventListener("change", updateRegistrationButtons);
  registerDialog?.querySelector("#team-register-close")?.addEventListener("click", () => registerDialog.close?.());
  registerDialog?.addEventListener("click", (event) => {
    if (event.target === registerDialog) registerDialog.close?.();
  });
}

function sharePayload(target) {
  if (target === "team") {
    return {
      url: teamUrl(SAMPLE_TEAM_ID),
      lineUrl: lineShareUrl(teamUrl(SAMPLE_TEAM_ID)),
      title: "SIGN TRAINER サンプルチーム",
      text: "SIGN TRAINERのサンプルチームです。合言葉は別途確認してください。",
      label: "サンプルチーム",
      note: "合言葉はURLやQRコードには含まれません。"
    };
  }
  return {
    url: topUrl(),
    lineUrl: topUrl(),
    title: "SIGN TRAINER",
    text: "野球のサインを動画でくり返し練習できるSIGN TRAINERです。",
    label: "SIGN TRAINER",
    note: "トップページのURLを共有します。"
  };
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

function openShareDialog(target) {
  if (!shareDialog) return;
  const data = sharePayload(target);
  shareDialog.dataset.target = target;
  const title = shareDialog.querySelector("#share-title");
  const lead = shareDialog.querySelector("#share-lead");
  const input = shareDialog.querySelector("#share-url");
  const note = shareDialog.querySelector("#share-note");
  const copyStatus = shareDialog.querySelector("#share-copy-status");
  const qrStatus = shareDialog.querySelector("#share-qr-status");
  const qr = shareDialog.querySelector("#share-qr");
  if (title) title.textContent = target === "team" ? "サンプルチームを共有" : "SIGN TRAINERを共有";
  if (lead) lead.textContent = "URL・QRコードから共有できます。";
  if (input) input.value = data.url;
  if (note) note.textContent = data.note;
  if (copyStatus) copyStatus.textContent = "";
  if (qrStatus) qrStatus.textContent = "QRコードを準備しています…";
  if (qr) {
    const qrCode = shareDialog.querySelector("#share-qr-code");
    qr.hidden = false;
    if (qrCode) qrCode.hidden = false;
    qr.alt = `${data.label}のQRコード`;
    qr.onload = () => { if (qrStatus) qrStatus.textContent = "中央のSIGN TRAINERアイコン付きQRです。"; };
    qr.onerror = () => {
      qr.hidden = true;
      if (qrCode) qrCode.hidden = true;
      if (qrStatus) qrStatus.textContent = "QRコードを表示できませんでした。URLコピーをご利用ください。";
    };
    qr.src = qrImageUrl(data.url, 360);
  }
  if (shareDialog.showModal) shareDialog.showModal();
  else shareDialog.setAttribute("open", "");
}

function initShareDialog() {
  if (!shareDialog) return;
  shareDialog.querySelector("#share-copy")?.addEventListener("click", async () => {
    const data = sharePayload(shareDialog.dataset.target || "site");
    const ok = await copyText(data.url);
    const status = shareDialog.querySelector("#share-copy-status");
    if (status) status.textContent = ok ? "リンクをコピーしました" : "コピーできませんでした";
  });
  shareDialog.querySelector("#share-native")?.addEventListener("click", async () => {
    const data = sharePayload(shareDialog.dataset.target || "site");
    if (navigator.share) {
      try { await navigator.share({ title: data.title, text: data.text, url: data.url }); }
      catch (error) { if (error?.name !== "AbortError") console.warn("share failed", error); }
    } else {
      const ok = await copyText(data.url);
      const status = shareDialog.querySelector("#share-copy-status");
      if (status) status.textContent = ok ? "共有メニュー非対応のため、リンクをコピーしました" : "このブラウザでは共有できません";
    }
  });
  shareDialog.querySelector("#share-line")?.addEventListener("click", () => {
    const data = sharePayload(shareDialog.dataset.target || "site");
    const message = `${data.text}\n${data.lineUrl}`;
    window.open(`https://line.me/R/share?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
  });
  shareDialog.querySelector("#share-close")?.addEventListener("click", () => shareDialog.close?.());
}

function initInstallTabs() {
  const tabs = [...document.querySelectorAll("[data-install-tab]")];
  const panels = [...document.querySelectorAll("[data-install-panel]")];
  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      const target = tab.dataset.installTab;
      tabs.forEach((item) => {
        const active = item === tab;
        item.classList.toggle("is-active", active);
        item.setAttribute("aria-selected", active ? "true" : "false");
      });
      panels.forEach((panel) => { panel.hidden = panel.dataset.installPanel !== target; });
    });
  });
}

function initMobileMenu() {
  const button = document.querySelector("#mobile-menu-button");
  const nav = document.querySelector("#mobile-nav");
  if (!button || !nav) return;
  const closedIcon = button.innerHTML;
  button.addEventListener("click", () => {
    const open = nav.classList.toggle("is-open");
    button.setAttribute("aria-expanded", String(open));
    button.setAttribute("aria-label", open ? "メニューを閉じる" : "メニューを開く");
    button.innerHTML = open ? "×" : closedIcon;
  });
  nav.querySelectorAll("a").forEach((link) => link.addEventListener("click", () => {
    nav.classList.remove("is-open");
    button.setAttribute("aria-expanded", "false");
    button.innerHTML = closedIcon;
  }));
}

initShareDialog();
initRegistrationDialog();
initInstallTabs();
initMobileMenu();
document.querySelector("#share-site")?.addEventListener("click", () => openShareDialog("site"));
document.querySelector("#share-sample-team")?.addEventListener("click", () => openShareDialog("team"));
