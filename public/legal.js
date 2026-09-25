const APP_BUILD = "__ASSET_VERSION__";
console.info(`[SIGN TRAINER] build ${APP_BUILD} legal`);

function applySupportLink(node, supportUrl) {
  const showUrlText = node.hasAttribute("data-support-url-text");
  if (!supportUrl) {
    node.removeAttribute("href");
    node.removeAttribute("target");
    node.removeAttribute("rel");
    node.textContent = showUrlText ? "問い合わせフォームURL未設定" : "問い合わせフォームを設定してください";
    node.classList.add("legal-config-missing");
    return;
  }
  node.href = supportUrl;
  node.target = "_blank";
  node.rel = "noopener noreferrer";
  node.classList.remove("legal-config-missing");
  if (showUrlText) node.textContent = supportUrl;
}

async function loadLegalConfig() {
  try {
    const response = await fetch("/api/public/legal", { cache: "no-store" });
    const data = await response.json();
    const operator = data.operatorName || "SIGN TRAINER 運営者";
    document.querySelectorAll("[data-operator-name]").forEach((node) => { node.textContent = operator; });
    document.querySelectorAll("[data-terms-version]").forEach((node) => { node.textContent = data.termsVersion || "2026-09-25"; });
    document.querySelectorAll("[data-privacy-version]").forEach((node) => { node.textContent = data.privacyVersion || "2026-09-25"; });
    document.querySelectorAll("[data-support-link]").forEach((node) => applySupportLink(node, data.supportUrl || ""));
    if (!data.configured) document.querySelector("#legal-config-warning")?.removeAttribute("hidden");
  } catch {
    document.querySelector("#legal-config-warning")?.removeAttribute("hidden");
  }
}

loadLegalConfig();
