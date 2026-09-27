import fs from "node:fs";
import path from "node:path";

const IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg"]);
const MAX_IMAGE_BYTES = 160 * 1024;
const MAX_TOTAL_BYTES = 1200 * 1024;
const root = path.resolve("public");
const failures: string[] = [];
const images: Array<{ file: string; bytes: number }> = [];

function walk(dir: string): void {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "build" || entry.name === "__pages") continue;
      walk(full);
      continue;
    }
    if (!entry.isFile() || !IMAGE_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) continue;
    const bytes = fs.statSync(full).size;
    images.push({ file: path.relative(process.cwd(), full), bytes });
    if (bytes > MAX_IMAGE_BYTES) failures.push(`${path.relative(process.cwd(), full)} is ${(bytes / 1024).toFixed(1)} KiB; limit is ${MAX_IMAGE_BYTES / 1024} KiB`);
  }
}

walk(root);
const totalBytes = images.reduce((sum, image) => sum + image.bytes, 0);
if (totalBytes > MAX_TOTAL_BYTES) {
  failures.push(`public image total is ${(totalBytes / 1024).toFixed(1)} KiB; limit is ${MAX_TOTAL_BYTES / 1024} KiB`);
}

for (const obsolete of [
  "public/assets/sign-trainer-icon.png",
  "public/assets/why-baseball.png",
  "public/assets/install-iphone.png",
  "public/assets/install-android.png",
  "public/og.png"
]) {
  if (fs.existsSync(obsolete)) failures.push(`obsolete heavy image must not return: ${obsolete}`);
}

if (failures.length) {
  console.error("Image budget check failed:\n- " + failures.join("\n- "));
  process.exit(1);
}

console.log(`Image budget check passed: ${images.length} files, ${(totalBytes / 1024).toFixed(1)} KiB total, largest ${(Math.max(...images.map((image) => image.bytes), 0) / 1024).toFixed(1)} KiB.`);
