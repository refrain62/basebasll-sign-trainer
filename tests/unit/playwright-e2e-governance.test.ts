import { describe, expect, test } from "vitest";
import { existsSync, readFileSync } from "node:fs";

const read = (file: string) => readFileSync(file, "utf8").replace(/\r\n/g, "\n");

describe("Playwright E2E regression harness", () => {
  test("keeps the E2E commands and config in place", () => {
    const pkg = JSON.parse(read("package.json"));
    expect(pkg.scripts["e2e:serve"]).toContain("scripts/e2e-server.ts");
    expect(pkg.devDependencies["@playwright/test"]).toBe("1.57.0");
    expect(pkg.scripts["e2e:install"]).toBe("playwright install chromium");
    expect(pkg.scripts["e2e:install:ci"]).toBe("playwright install --with-deps chromium");
    expect(pkg.scripts["typecheck:e2e"]).toBe("tsc -p tsconfig.e2e.json");
    expect(pkg.scripts["test:e2e"]).toBe("playwright test");
    expect(pkg.packageManager).toBe("pnpm@12.10.0");
    expect(existsSync("playwright.config.ts")).toBe(true);
    expect(existsSync("tsconfig.e2e.json")).toBe(true);
    expect(existsSync("scripts/e2e-server.ts")).toBe(true);
    expect(existsSync("tests/e2e/admin-management.spec.ts")).toBe(true);
  });

  test("runs E2E in CI after normal checks and pins the Playwright package version", () => {
    const workflow = read(".github/workflows/ci.yml");
    const config = read("playwright.config.ts");
    expect(workflow).toContain("e2e:");
    expect(workflow).toContain("needs: checks");
    expect(workflow).toContain("pnpm/setup@703c52620218391530e48b9e8870d5c0082e1b9b # v2.1.0");
    expect(workflow).toContain("pnpm run e2e:install:ci");
    expect(workflow).toContain("pnpm run typecheck:e2e");
    expect(workflow).toContain("pnpm run test:e2e");
    expect(workflow).toContain("actions/upload-artifact@043fb46d1a93c77aae656e7c1c64a875d1fc6a0a # v7.0.1");
    expect(workflow).toContain("playwright-report/");
    expect(workflow).toContain("test-results/");
    expect(config).toContain('command: "pnpm run e2e:serve"');
  });

  test("keeps isolated management E2E coverage for system and team admin", () => {
    const management = read("tests/e2e/admin-management.spec.ts");
    const server = read("scripts/e2e-server.ts");
    expect(management).toContain("system admin can create, edit plan, withdraw and restore a team");
    expect(management).toContain("system admin can publish and delete a system notice");
    expect(management).toContain("team admin session survives every management route");
    expect(management).toContain("team admin can manage groups, signs, videos and team settings");
    expect(management).toContain("mobile system and team admin menus navigate without layout regression");
    expect(management).toContain("localManagementE2E");
    expect(server).toContain(".wrangler/e2e-state");
    expect(server).toContain('"d1", "migrations", "apply"');
    expect(server).toContain("--persist-to");
    expect(server).toContain("--local");
    expect(server).toContain("REQUIRE_CF_ACCESS_FOR_SYSTEM_ADMIN:false");
  });

  test("guards the previously broken LP route family and first-party links", () => {
    const pages = read("tests/e2e/public-pages.spec.ts");
    const links = read("tests/e2e/navigation-and-assets.spec.ts");
    expect(pages).toContain('"/plans", "/plans/", "/plans.html"');
    expect(pages).toContain('"/install", "/install/", "/install.html"');
    expect(pages).toContain("ページを読み込めませんでした。");
    expect(links).toContain("all first-party links exposed by the LP resolve successfully");
    expect(links).toContain("all first-party assets referenced by public pages return successfully");
  });
});
