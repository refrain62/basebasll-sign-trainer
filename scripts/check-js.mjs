import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const roots = ["src", "public", "scripts"];
const files = [];
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(file);
    else if (entry.isFile() && (file.endsWith(".js") || file.endsWith(".mjs"))) files.push(file);
  }
}
for (const root of roots) if (fs.existsSync(root)) walk(root);

for (const file of files) {
  const result = spawnSync(process.execPath, ["--check", file], { stdio: "inherit" });
  if (result.status !== 0) process.exit(result.status || 1);
}
console.log(`Syntax check passed: ${files.length} JavaScript files.`);
