import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const failures = [];

if (pkg.devDependencies?.wrangler !== "4.136.3") {
  failures.push("wrangler must be pinned exactly to 4.136.3");
}
if (pkg.dependencies?.hono !== "4.13.8") {
  failures.push("hono must be pinned exactly to 4.13.8");
}
if (!fs.existsSync(path.join(root, "package-lock.json"))) {
  failures.push("package-lock.json is missing. Run `npm install --package-lock-only --ignore-scripts` once and commit it before deploy.");
}
const wrangler = JSON.parse(fs.readFileSync(path.join(root, "wrangler.jsonc"), "utf8"));
const requiredSecuritySecrets = ["SESSION_SECRET", "SYSTEM_ADMIN_SECRET", "PASSWORD_PEPPER", "DATA_ENCRYPTION_KEY", "DATA_LOOKUP_KEY"];
for (const name of requiredSecuritySecrets) {
  if (!(wrangler.secrets?.required || []).includes(name)) failures.push(`wrangler production required secret missing: ${name}`);
  for (const envName of ["dev", "staging"]) {
    if (!(wrangler.env?.[envName]?.secrets?.required || []).includes(name)) failures.push(`wrangler ${envName} required secret missing: ${name}`);
  }
}
for (const secretFile of [".dev.vars", ".dev.vars.dev", ".env", ".env.local"]) {
  if (fs.existsSync(path.join(root, secretFile)) && process.env.ALLOW_LOCAL_SECRET_FILES !== "1") {
    console.warn(`[security] local secret file exists: ${secretFile} (allowed for local dev; never include it in distributed ZIP/Git)`);
  }
}
const allowedRuntime = new Set(["hono"]);
const allowedDev = new Set(["wrangler"]);
for (const name of Object.keys(pkg.dependencies || {})) if (!allowedRuntime.has(name)) failures.push(`unexpected runtime dependency: ${name}`);
for (const name of Object.keys(pkg.devDependencies || {})) if (!allowedDev.has(name)) failures.push(`unexpected dev dependency: ${name}`);

if (failures.length) {
  console.error("Security preflight failed:\n- " + failures.join("\n- "));
  process.exit(1);
}
console.log("Security preflight passed.");
