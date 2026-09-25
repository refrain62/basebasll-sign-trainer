import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root = path.resolve("public/build");
const files: string[] = [];

function walk(dir: string): void {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(file);
    else if (entry.isFile() && /\.(?:js|mjs|cjs)$/.test(file)) files.push(file);
  }
}

walk(root);
if (!files.length) {
  console.error("Vite build output JS was not found under public/build/. Run `npm run build:client` first.");
  process.exit(1);
}

for (const file of files) {
  const result = spawnSync(process.execPath, ["--check", file], { stdio: "inherit" });
  if (result.status !== 0) process.exit(result.status || 1);
}
console.log(`JavaScript syntax check passed: ${files.length} Vite-generated browser bundles.`);
