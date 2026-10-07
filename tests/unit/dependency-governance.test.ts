import { describe, expect, test } from "vitest";
import { readFileSync } from "node:fs";

const read = (file: string) => readFileSync(file, "utf8");

describe("dependency governance", () => {
  test("keeps runtime, Node types and Vitest companion packages aligned with Node 24", () => {
    const pkg = JSON.parse(read("package.json"));
    expect(pkg.engines.node).toBe(">=24 <25");
    expect(pkg.engines.npm).toBe(">=11 <12");
    expect(pkg.packageManager).toBe("npm@11.6.2");
    expect(pkg.devDependencies["@types/node"]).toMatch(/^24\./);
    expect(pkg.devDependencies.vitest).toBe(pkg.devDependencies["@vitest/coverage-v8"]);
    for (const version of [...Object.values(pkg.dependencies || {}), ...Object.values(pkg.devDependencies || {})]) {
      expect(String(version)).toMatch(/^\d+\.\d+\.\d+$/);
    }
  });

  test("prevents Dependabot from separating Node types and Vitest companion packages", () => {
    const config = read(".github/dependabot.yml");
    expect(config).toContain('dependency-name: "@types/node"');
    expect(config).toContain('version-update:semver-major');
    expect(config).toContain("vitest-tooling:");
    expect(config).toContain('"@vitest/*"');
    expect(config).toContain("package-ecosystem: github-actions");
  });

  test("keeps CI and predeploy runtime guards on the Node 24 toolchain", () => {
    const pkg = JSON.parse(read("package.json"));
    const workflow = read(".github/workflows/ci.yml");
    expect(pkg.scripts["predeploy:dev"]).toContain("scripts/security-preflight.ts");
    expect(pkg.scripts["predeploy:staging"]).toContain("scripts/security-preflight.ts");
    expect(pkg.scripts["predeploy:prod"]).toContain("scripts/security-preflight.ts");
    expect(workflow).toContain("node-version: 24");
    expect(workflow).toContain("actions/checkout@v5");
    expect(workflow).toContain("actions/setup-node@v5");
    expect(workflow).toContain("ubuntu-24.04");
  });

  test("keeps the audited Wrangler version aligned with the security preflight", () => {
    const pkg = JSON.parse(read("package.json"));
    const preflight = read("scripts/security-preflight.ts");
    expect(pkg.devDependencies.wrangler).toBe("4.148.0");
    expect(pkg.overrides).toEqual({ sharp: "0.35.5", "source-map-js": "1.2.2" });
    expect(preflight).toContain('const requiredWranglerVersion = "4.148.0";');
    expect(preflight).toContain("wrangler must be pinned exactly to ${requiredWranglerVersion}");
  });
});
