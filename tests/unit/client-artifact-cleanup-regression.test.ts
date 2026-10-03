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
      "og.png"
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
  });
});
