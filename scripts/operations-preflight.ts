import fs from "node:fs";

interface WranglerConfig {
  vars?: Record<string, unknown>;
}

export function isValidPublicOperatorName(value: unknown): boolean {
  const operator = String(value || "").trim();
  return Boolean(operator) && !/change[_ -]?me/i.test(operator);
}

export function runOperationsPreflight(configPath = "wrangler.jsonc"): void {
  const config = JSON.parse(fs.readFileSync(configPath, "utf8")) as WranglerConfig;
  const vars = config.vars || {};
  const failures: string[] = [];
  const operator = String(vars.PUBLIC_OPERATOR_NAME || "").trim();
  const supportUrl = String(vars.PUBLIC_SUPPORT_URL || "").trim();

  if (!isValidPublicOperatorName(operator)) {
    failures.push("PUBLIC_OPERATOR_NAME を設定してください。");
  }

  let validSupportUrl = false;
  try {
    const url = new URL(supportUrl);
    validSupportUrl = url.protocol === "https:"
      && Boolean(url.hostname)
      && !url.username
      && !url.password
      && !/^(example\.(com|invalid)|localhost)$/i.test(url.hostname)
      && !/replace[_ -]?me/i.test(supportUrl);
  } catch {
    validSupportUrl = false;
  }

  if (!validSupportUrl) {
    failures.push("PUBLIC_SUPPORT_URL を実際のHTTPS問い合わせフォームURLへ変更してください。");
  }

  for (const file of ["pages/terms.html", "pages/privacy.html", "pages/external-transmission.html", "pages/support.html"]) {
    if (!fs.existsSync(file)) failures.push(`${file} がありません。`);
  }

  if (failures.length) {
    console.error("Operations preflight failed:\n- " + failures.join("\n- "));
    process.exit(1);
  }
  console.log("Operations preflight passed.");
}

if (import.meta.main) runOperationsPreflight();
