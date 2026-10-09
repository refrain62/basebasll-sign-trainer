import { describe, expect, test } from "vitest";
import { readFileSync } from "node:fs";

const read = (file: string) => readFileSync(file, "utf8");

describe("client artifact cleanup", () => {
  test("removes all known obsolete heavy images before Vite build", () => {
    const cleanup = read("scripts/clean-client-artifacts.ts");
    for (const file of [
      "assets/sign-trainer-icon.png",
      "assets/why-baseball.png",
      "assets/install-iphone.png",
      "assets/install-android.png",
      "assets/lp-feature-admin_2.png",
      "assets/team-pwa-install-guide.png",
      "og.png",
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
    ]) {
      expect(cleanup).toContain(file);
    }
  });

  test("keeps the image budget guard aligned with the cleanup list", () => {
    const budget = read("scripts/image-budget-check.ts");
    expect(budget).toContain("public/assets/lp-feature-admin_2.png");
    expect(budget).toContain("public/assets/team-pwa-install-guide.png");
    expect(budget).toContain("public/assets/sign-trainer-icon.png");
    expect(budget).toContain("public/og.png");
    expect(budget).toContain("public/assets/install-android-12.webp");
    expect(budget).toContain("public/assets/lp-feature-admin_2.webp");
    expect(budget).toContain("public/assets/ref-install-photo.webp");
  });
});
