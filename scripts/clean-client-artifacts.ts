import fs from "node:fs";
import path from "node:path";

const publicDir = path.resolve("public");
const preservedRootScripts = new Set(["sw.js"]);
const removedScripts: string[] = [];
const removedImages: string[] = [];

const obsoleteHeavyImages = [
  "assets/sign-trainer-icon.png",
  "assets/why-baseball.png",
  "assets/install-iphone.png",
  "assets/install-android.png",
  "assets/lp-feature-admin_2.png",
  "assets/team-pwa-install-guide.png",
  "og.png"
];

if (fs.existsSync(publicDir)) {
  for (const entry of fs.readdirSync(publicDir, { withFileTypes: true })) {
    if (!entry.isFile()) continue;
    if (!/\.(?:js|mjs|cjs)$/.test(entry.name)) continue;
    if (preservedRootScripts.has(entry.name)) continue;
    fs.rmSync(path.join(publicDir, entry.name));
    removedScripts.push(entry.name);
  }

  for (const relative of obsoleteHeavyImages) {
    const file = path.join(publicDir, relative);
    if (!fs.existsSync(file)) continue;
    fs.rmSync(file);
    removedImages.push(relative);
  }
}

if (removedScripts.length) {
  console.log(`Removed stale public root JavaScript artifacts: ${removedScripts.join(", ")}`);
} else {
  console.log("No stale public root JavaScript artifacts found.");
}

if (removedImages.length) {
  console.log(`Removed obsolete heavy public images: ${removedImages.join(", ")}`);
} else {
  console.log("No obsolete heavy public images found.");
}
