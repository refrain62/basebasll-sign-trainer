import { describe, expect, test } from "vitest";
import { readFileSync } from "node:fs";

const read = (file: string) => readFileSync(file, "utf8");

describe("client source artifact policy", () => {
  test("preserves the service worker but rejects stale root JavaScript", () => {
    const check = read("scripts/client-source-check.ts");
    expect(check).toContain('new Set(["sw.js"])');
    expect(check).toContain("stale first-party public root JavaScript remains");
    expect(check).toContain("PWA service worker is missing: public/sw.js");
  });

  test("cleans stale public root JavaScript before Vite builds", () => {
    const pkg = JSON.parse(read("package.json"));
    expect(pkg.scripts["build:client"]).toMatch(/^node --experimental-strip-types scripts\/clean-client-artifacts\.ts && vite build$/);
    const cleaner = read("scripts/clean-client-artifacts.ts");
    expect(cleaner).toContain('new Set(["sw.js"])');
    expect(cleaner).toContain("fs.rmSync");
  });
});
