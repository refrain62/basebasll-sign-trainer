// Source of truth: TypeScript. Vite generates content-hashed browser bundles under public/build/.
import { initSiteChrome } from "./site-chrome";
import { initEnvironmentContextBadge } from "./environment-context";
const APP_BUILD = __APP_VERSION__;
console.info(`[SIGN TRAINER] build ${APP_BUILD} legal`);


function supportUrlWithContext(rawUrl, environment = "") {
  if (!rawUrl) return "";
  try {
    const url = new URL(String(rawUrl));
    const params = new URLSearchParams(location.search);
    for (const key of ["teamId", "teamName", "plan", "environment"]) {
      const value = params.get(key);
      if (value) url.searchParams.set(key, value);
    }
    if (!url.searchParams.get("environment") && environment) url.searchParams.set("environment", String(environment));
    return url.toString();
  } catch {
    return rawUrl;
  }
}

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
    document.querySelectorAll("[data-support-link]").forEach((node) => applySupportLink(node, supportUrlWithContext(data.supportUrl || "", data.environment || "")));
    if (!data.configured) document.querySelector("#legal-config-warning")?.removeAttribute("hidden");
  } catch {
    document.querySelector("#legal-config-warning")?.removeAttribute("hidden");
  }
}

initEnvironmentContextBadge();
loadLegalConfig();

initSiteChrome();
