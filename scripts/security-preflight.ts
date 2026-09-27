import fs from "node:fs";
import path from "node:path";

interface PackageJson {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

interface WranglerEnvironment {
  secrets?: { required?: string[] };
  version_metadata?: { binding?: string };
}

interface WranglerConfig {
  secrets?: { required?: string[] };
  version_metadata?: { binding?: string };
  env?: Record<string, WranglerEnvironment>;
}

const root = process.cwd();
const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8")) as PackageJson;
const failures: string[] = [];

if (pkg.devDependencies?.wrangler !== "4.141.0") failures.push("wrangler must be pinned exactly to 4.141.0");
if (pkg.dependencies?.hono !== "4.13.8") failures.push("hono must be pinned exactly to 4.13.8");
if (pkg.dependencies?.zod !== "4.6.5") failures.push("zod must be pinned exactly to 4.6.5");
if (pkg.dependencies?.qrcode !== "1.5.4") failures.push("qrcode must be pinned exactly to 1.5.4");
if (pkg.devDependencies?.["@types/qrcode"] !== "1.5.6") failures.push("@types/qrcode must be pinned exactly to 1.5.6");
if (pkg.dependencies?.["@synapxlab/qrcode"]) failures.push("legacy @synapxlab/qrcode dependency must be removed");
if (pkg.devDependencies?.typescript !== "7.0.2") failures.push("typescript must be pinned exactly to 7.0.2");
if (pkg.devDependencies?.["@types/node"] !== "24.10.15") failures.push("@types/node must be pinned exactly to 24.10.15");
if (pkg.devDependencies?.vite !== "8.3.1") failures.push("vite must be pinned exactly to 8.3.1");
if (pkg.devDependencies?.vitest !== "5.0.1") failures.push("vitest must be pinned exactly to 5.0.1");
if (pkg.devDependencies?.["@vitest/coverage-v8"] !== "5.0.1") failures.push("@vitest/coverage-v8 must be pinned exactly to 5.0.1");

if (!fs.existsSync(path.join(root, "package-lock.json"))) {
  failures.push("package-lock.json is missing. Run `npm install --package-lock-only --ignore-scripts` once and commit it before deploy.");
}

const wrangler = JSON.parse(fs.readFileSync(path.join(root, "wrangler.jsonc"), "utf8")) as WranglerConfig;
const requiredSecuritySecrets = ["SESSION_SECRET", "SYSTEM_ADMIN_SECRET", "PASSWORD_PEPPER", "DATA_ENCRYPTION_KEY", "DATA_LOOKUP_KEY"];
for (const name of requiredSecuritySecrets) {
  if (!(wrangler.secrets?.required || []).includes(name)) failures.push(`wrangler production required secret missing: ${name}`);
  for (const envName of ["dev", "staging"]) {
    if (!(wrangler.env?.[envName]?.secrets?.required || []).includes(name)) failures.push(`wrangler ${envName} required secret missing: ${name}`);
  }
}

const versionMetadataBinding = "CF_VERSION_METADATA";
if (wrangler.version_metadata?.binding !== versionMetadataBinding) {
  failures.push(`wrangler production version_metadata.binding must be ${versionMetadataBinding}`);
}
for (const envName of ["dev", "staging"]) {
  if (wrangler.env?.[envName]?.version_metadata?.binding !== versionMetadataBinding) {
    failures.push(`wrangler ${envName} version_metadata.binding must be ${versionMetadataBinding}`);
  }
}

for (const secretFile of [".dev.vars", ".dev.vars.dev", ".env", ".env.local"]) {
  if (fs.existsSync(path.join(root, secretFile)) && process.env.ALLOW_LOCAL_SECRET_FILES !== "1") {
    console.warn(`[security] local secret file exists: ${secretFile} (allowed for local dev; never include it in distributed ZIP/Git)`);
  }
}

const allowedRuntime = new Set(["hono", "zod", "qrcode"]);
const allowedDev = new Set(["wrangler", "typescript", "@types/node", "@types/qrcode", "vite", "vitest", "@vitest/coverage-v8"]);
for (const name of Object.keys(pkg.dependencies || {})) if (!allowedRuntime.has(name)) failures.push(`unexpected runtime dependency: ${name}`);
for (const name of Object.keys(pkg.devDependencies || {})) if (!allowedDev.has(name)) failures.push(`unexpected dev dependency: ${name}`);

if (failures.length) {
  console.error("Security preflight failed:\n- " + failures.join("\n- "));
  process.exit(1);
}
console.log("Security preflight passed.");
