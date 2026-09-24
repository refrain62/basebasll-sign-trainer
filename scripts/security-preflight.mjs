import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const failures = [];

if (pkg.devDependencies?.wrangler !== "4.136.3") {
  failures.push("wrangler must be pinned exactly to 4.136.3");
}
if (!fs.existsSync(path.join(root, "package-lock.json"))) {
  failures.push("package-lock.json is missing. Run `npm install --package-lock-only --ignore-scripts` once and commit it before deploy.");
}
for (const secretFile of [".dev.vars", ".dev.vars.dev", ".env", ".env.local"]) {
  if (fs.existsSync(path.join(root, secretFile)) && process.env.ALLOW_LOCAL_SECRET_FILES !== "1") {
    console.warn(`[security] local secret file exists: ${secretFile} (allowed for local dev; never include it in distributed ZIP/Git)`);
  }
}
const allowedDirect = new Set(["wrangler"]);
for (const name of Object.keys(pkg.dependencies || {})) if (!allowedDirect.has(name)) failures.push(`unexpected runtime dependency: ${name}`);
for (const name of Object.keys(pkg.devDependencies || {})) if (!allowedDirect.has(name)) failures.push(`unexpected dev dependency: ${name}`);

if (failures.length) {
  console.error("Security preflight failed:\n- " + failures.join("\n- "));
  process.exit(1);
}
console.log("Security preflight passed.");
