import { describe, expect, test } from "vitest";
import { readFileSync } from "node:fs";

const read = (file: string) => readFileSync(file, "utf8");

describe("Node 24 runtime baseline", () => {
  test("pins local, CI, engines and type definitions to Node 24", () => {
    const pkg = JSON.parse(read("package.json"));
    expect(pkg.engines.node).toBe(">=24 <25");
    expect(pkg.engines.npm).toBe(">=11 <12");
    expect(pkg.packageManager).toBe("npm@11.6.2");
    expect(pkg.devDependencies["@types/node"]).toMatch(/^24\./);
    expect(read(".nvmrc").trim()).toBe("24");
    expect(read(".node-version").trim()).toBe("24");
    expect(read(".github/workflows/ci.yml")).toMatch(/node-version:\s*24/);
    expect(read(".github/workflows/ci.yml")).toMatch(/runs-on:\s*ubuntu-24\.04/);
    expect(read(".github/workflows/ci.yml")).toMatch(/uses:\s*actions\/checkout@[0-9a-f]{40}\s+# v\d+\.\d+\.\d+/);
    expect(read(".github/workflows/ci.yml")).toMatch(/uses:\s*actions\/setup-node@[0-9a-f]{40}\s+# v\d+\.\d+\.\d+/);
  });

  test("prevents Dependabot from moving @types/node to a different major", () => {
    const dependabot = read(".github/dependabot.yml");
    expect(dependabot).toContain('dependency-name: "@types/node"');
    expect(dependabot).toContain('version-update:semver-major');
    expect(dependabot).toContain("package-ecosystem: github-actions");
  });

  test("requires the lockfile root metadata to match the Node 24 package baseline", () => {
    const preflight = read("scripts/security-preflight.ts");
    expect(preflight).toContain("package-lock.json engines are out of sync");
    expect(preflight).toContain("package-lock.json devDependencies are out of sync");
    expect(preflight).toContain("regenerate the lockfile with Node 24");
  });

  test("runs the runtime guard before normal checks and deploys", () => {
    const pkg = JSON.parse(read("package.json"));
    expect(pkg.scripts.check).toMatch(/^npm run runtime:check/);
    expect(pkg.scripts["predeploy:prod"]).toMatch(/^npm run runtime:check/);
    expect(read("scripts/runtime-version-check.ts")).toContain("major !== 24");
  });
});
