import fs from "node:fs";
import path from "node:path";
import { validateClientArtifacts } from "./client-artifact-check.ts";

const failures: string[] = [];

failures.push(...validateClientArtifacts());

const allowedPublicRootScripts = new Set(["sw.js"]);
const unexpectedPublicRootScripts = fs.readdirSync("public", { withFileTypes: true })
  .filter((entry) => entry.isFile() && /\.(?:js|mjs|cjs)$/.test(entry.name) && !allowedPublicRootScripts.has(entry.name))
  .map((entry) => entry.name);
if (unexpectedPublicRootScripts.length) {
  failures.push(`stale first-party public root JavaScript remains: ${unexpectedPublicRootScripts.join(", ")}`);
}
if (!fs.existsSync(path.resolve("public/sw.js"))) failures.push("PWA service worker is missing: public/sw.js");

const clientJsSources: string[] = [];
function collectClientJs(dir: string): void {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) collectClientJs(full);
    else if (entry.isFile() && /\.(?:js|mjs|cjs)$/.test(entry.name)) clientJsSources.push(path.relative(process.cwd(), full));
  }
}
collectClientJs(path.resolve("client"));
if (clientJsSources.length) failures.push(`hand-written JavaScript remains under client/: ${clientJsSources.join(", ")}`);

const packageJson = JSON.parse(fs.readFileSync(path.resolve("package.json"), "utf8")) as {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
};
if (packageJson.dependencies?.qrcode !== "1.5.4") {
  failures.push("qrcode must be pinned to 1.5.4 in dependencies");
}
if (packageJson.devDependencies?.["@types/qrcode"] !== "1.5.6") {
  failures.push("@types/qrcode must be pinned to 1.5.6 in devDependencies");
}
if (packageJson.dependencies?.["@synapxlab/qrcode"]) {
  failures.push("legacy @synapxlab/qrcode dependency must be removed");
}

if (failures.length) {
  console.error("Vite client source check failed:\n- " + failures.join("\n- "));
  process.exit(1);
}
console.log("Vite client source check passed: all rendered pages and referenced assets are present.");
