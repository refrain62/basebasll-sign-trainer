import { describe, expect, test } from "vitest";
import { readFileSync } from "node:fs";

const read = (file: string) => readFileSync(file, "utf8");

describe("dependency governance", () => {
  test("keeps runtime, Node types, Vitest and Wrangler on the reviewed versions", () => {
    const pkg = JSON.parse(read("package.json"));
    expect(pkg.dependencies.hono).toBe("4.13.11");
    expect(pkg.devDependencies["@types/node"]).toBe("22.20.5");
    expect(pkg.devDependencies.vitest).toBe("5.0.2");
    expect(pkg.devDependencies["@vitest/coverage-v8"]).toBe("5.0.2");
    expect(pkg.devDependencies.wrangler).toBe("4.143.0");
    expect(pkg.engines.node).toBe(">=22.12 <23");
  });

  test("prevents Dependabot from separating Node types and Vitest companion packages", () => {
    const config = read(".github/dependabot.yml");
    expect(config).toContain('dependency-name: "@types/node"');
    expect(config).toContain('version-update:semver-major');
    expect(config).toContain("vitest-stack:");
    expect(config).toContain('"@vitest/*"');
  });

  test("runs the dependency policy in CI and normal tooling checks", () => {
    const pkg = JSON.parse(read("package.json"));
    const workflow = read(".github/workflows/ci.yml");
    expect(pkg.scripts["tooling:check"]).toContain("scripts/dependency-policy-check.ts");
    expect(pkg.scripts["predeploy:prod"]).toContain("dependency:policy");
    expect(workflow).toContain("npm run dependency:policy");
    expect(workflow).toContain("node-version: 22");
  });
});
