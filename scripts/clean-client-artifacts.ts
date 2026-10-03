import fs from "node:fs";
import path from "node:path";

const publicDir = path.resolve("public");
const preservedRootScripts = new Set(["sw.js"]);
const removedScripts: string[] = [];
const removedImages: string[] = [];

const obsoletePublicImages = [
  // Legacy heavy PNGs replaced by smaller WebP/JPEG assets.
  "assets/sign-trainer-icon.png",
  "assets/why-baseball.png",
  "assets/install-iphone.png",
  "assets/install-android.png",
  "assets/lp-feature-admin_2.png",
  "assets/team-pwa-install-guide.png",
  "og.png",

  // Old/combined/reference WebP variants that are no longer referenced by the current pages.
  // These can remain in git when a release ZIP is overlaid onto an existing worktree,
  // so remove them deterministically before the image-budget check.
  "assets/faq-hero-clean.webp",
  "assets/install-android-12.webp",
  "assets/install-android-34.webp",
  "assets/install-iphone-12.webp",
  "assets/install-iphone-34.webp",
  "assets/lp-feature-admin_2.webp",
  "assets/lp-rec-bond.webp",
  "assets/lp-rec-new.webp",
  "assets/lp-rec-team.webp",
  "assets/lp-rec-variety.webp",
  "assets/ref-faq-hero.webp",
  "assets/ref-faq-photo.webp",
  "assets/ref-home-hero.webp",
  "assets/ref-home-photo.webp",
  "assets/ref-install-hero.webp",
  "assets/ref-install-photo.webp"
];

if (fs.existsSync(publicDir)) {
  for (const entry of fs.readdirSync(publicDir, { withFileTypes: true })) {
    if (!entry.isFile()) continue;
    if (!/\.(?:js|mjs|cjs)$/.test(entry.name)) continue;
    if (preservedRootScripts.has(entry.name)) continue;
    fs.rmSync(path.join(publicDir, entry.name));
    removedScripts.push(entry.name);
  }

  for (const relative of obsoletePublicImages) {
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
  console.log(`Removed obsolete public images: ${removedImages.join(", ")}`);
} else {
  console.log("No obsolete public images found.");
}
