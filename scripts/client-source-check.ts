import fs from "node:fs";
import path from "node:path";

const expectedEntries = ["landing", "team", "admin-entry", "account", "legal"];
const pages = ["index", "team", "admin", "account", "terms", "privacy", "external-transmission", "support"];
const manifestPath = path.resolve("public/build/manifest.json");
const failures: string[] = [];

if (!fs.existsSync(manifestPath)) {
  failures.push("Vite manifest is missing. Run `npm run build:client` first.");
} else {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8")) as Record<string, { name?: string; file?: string; src?: string; isEntry?: boolean }>;
  const entryNames = new Set(Object.entries(manifest)
    .filter(([, item]) => item.isEntry)
    .map(([key, item]) => item.name || path.basename(item.src || key).replace(/\.[^.]+$/, "")));
  for (const name of expectedEntries) if (!entryNames.has(name)) failures.push(`Vite entry missing from manifest: ${name}`);
  for (const item of Object.values(manifest)) {
    if (!item.file) continue;
    if (!fs.existsSync(path.join("public/build", item.file))) failures.push(`Vite output missing: public/build/${item.file}`);
  }
}

for (const page of pages) {
  const template = path.resolve(`pages/${page}.html`);
  const generated = path.resolve(`public/${page}.html`);
  const snapshot = path.resolve(`public/__pages/${page}.txt`);
  if (!fs.existsSync(template)) failures.push(`page template missing: pages/${page}.html`);
  if (!fs.existsSync(generated)) failures.push(`generated page missing: public/${page}.html`);
  if (!fs.existsSync(snapshot)) failures.push(`worker page snapshot missing: public/__pages/${page}.txt`);
  if (fs.existsSync(generated) && fs.existsSync(snapshot) && fs.readFileSync(generated, "utf8") !== fs.readFileSync(snapshot, "utf8")) {
    failures.push(`generated page and worker snapshot differ: ${page}`);
  }
}

const legacyGeneratedJs = fs.readdirSync("public", { withFileTypes: true })
  .filter((entry) => entry.isFile() && entry.name.endsWith(".js"))
  .map((entry) => entry.name);
if (legacyGeneratedJs.length) failures.push(`legacy first-party public/*.js remains: ${legacyGeneratedJs.join(", ")}`);

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
console.log(`Vite client source check passed: ${expectedEntries.length} entries, ${pages.length} rendered pages.`);
