export const TERMS_VERSION = "2026-09-25";
export const PRIVACY_VERSION = "2026-09-25";
export const EXTERNAL_TRANSMISSION_VERSION = "2026-09-25";

export function isValidPublicSupportUrl(value) {
  const raw = String(value || "").trim();
  if (!raw || raw.length > 2048) return false;
  try {
    const url = new URL(raw);
    return url.protocol === "https:" && Boolean(url.hostname) && !url.username && !url.password;
  } catch {
    return false;
  }
}

export function publicLegalConfig(env = {}) {
  const operatorName = String(env.PUBLIC_OPERATOR_NAME || "").trim().slice(0, 160);
  const rawSupportUrl = String(env.PUBLIC_SUPPORT_URL || "").trim().slice(0, 2048);
  const supportUrl = isValidPublicSupportUrl(rawSupportUrl) ? rawSupportUrl : "";
  return {
    operatorName,
    supportUrl,
    termsVersion: TERMS_VERSION,
    privacyVersion: PRIVACY_VERSION,
    externalTransmissionVersion: EXTERNAL_TRANSMISSION_VERSION,
    configured: Boolean(operatorName && supportUrl)
  };
}

export function legalConsentMatches({ termsVersion, privacyVersion } = {}) {
  return String(termsVersion || "") === TERMS_VERSION && String(privacyVersion || "") === PRIVACY_VERSION;
}
