import fs from "node:fs";
import path from "node:path";

const publicDir = path.resolve("public");
const preservedRootScripts = new Set(["sw.js"]);
const removed: string[] = [];

if (fs.existsSync(publicDir)) {
  for (const entry of fs.readdirSync(publicDir, { withFileTypes: true })) {
    if (!entry.isFile()) continue;
    if (!/\.(?:js|mjs|cjs)$/.test(entry.name)) continue;
    if (preservedRootScripts.has(entry.name)) continue;
    fs.rmSync(path.join(publicDir, entry.name));
    removed.push(entry.name);
  }
}

if (removed.length) {
  console.log(`Removed stale public root JavaScript artifacts: ${removed.join(", ")}`);
} else {
  console.log("No stale public root JavaScript artifacts found.");
}
