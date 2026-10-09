import { describe, expect, test } from "vitest";
import { readFileSync } from "node:fs";
import { findInvalidGitHubActionUses } from "../../scripts/github-action-pin-policy.ts";

const read = (file: string) => readFileSync(file, "utf8");

describe("dependency governance", () => {
  test("keeps runtime, Node types and Vitest companion packages aligned with Node 24", () => {
    const pkg = JSON.parse(read("package.json"));
    expect(pkg.engines.node).toBe(">=24 <25");
    expect(pkg.engines.pnpm).toBe(">=12 <13");
    expect(pkg.packageManager).toBe("pnpm@12.10.0");
    expect(pkg.devDependencies["@types/node"]).toMatch(/^24\./);
    expect(pkg.devDependencies.vitest).toBe(pkg.devDependencies["@vitest/coverage-v8"]);
    for (const version of [...Object.values(pkg.dependencies || {}), ...Object.values(pkg.devDependencies || {})]) {
      expect(String(version)).toMatch(/^\d+\.\d+\.\d+$/);
    }
  });

  test("prevents Dependabot from separating Node types and Vitest companion packages", () => {
    const config = read(".github/dependabot.yml");
    expect(config).toContain('dependency-name: "@types/node"');
    expect(config).toContain("version-update:semver-major");
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
    expect(workflow).toMatch(/uses:\s*actions\/checkout@[0-9a-f]{40}\s+# v\d+\.\d+\.\d+/);
    expect(workflow).toMatch(/uses:\s*actions\/setup-node@[0-9a-f]{40}\s+# v\d+\.\d+\.\d+/);
    expect(findInvalidGitHubActionUses(workflow)).toEqual([]);
    expect(workflow).toContain("ubuntu-24.04");
  });

  test("rejects remote action refs without a full SHA and semver release comment", () => {
    const sha = "3d3c42e5aac5ba805825da76410c181273ba90b1";
    const invalidReferences = [
      `actions/checkout@${sha}`,
      `actions/setup-node@${sha} # v7`,
      `actions/checkout@${sha.slice(0, 7)} # v7.0.1`,
      "actions/setup-node@v7.0.0 # v7.0.0"
    ];
    const workflow = [
      ...invalidReferences.map((reference) => `      - uses: ${reference}`),
      "      - uses: ./.github/actions/local-action"
    ].join("\n");

    expect(findInvalidGitHubActionUses(workflow).map(({ reference }) => reference)).toEqual(invalidReferences);
  });

  test("keeps the audited Wrangler version aligned with the security preflight", () => {
    const pkg = JSON.parse(read("package.json"));
    const preflight = read("scripts/security-preflight.ts");
    expect(pkg.scripts.check).toContain("pnpm run security:preflight");
    const workspaceConfig = read("pnpm-workspace.yaml");
    expect(pkg.devDependencies.wrangler).toBe("4.148.0");
    expect(pkg.overrides).toEqual({ sharp: "0.35.5", "source-map-js": "1.2.2" });
    expect(workspaceConfig).toMatch(/^overrides:\s*$[\s\S]*^\s+sharp:\s*0\.35\.5\s*$/m);
    expect(workspaceConfig).toContain("saveExact: true");
    expect(workspaceConfig).toContain("lockfile: true");
    expect(workspaceConfig).toContain("ignoreScripts: true");
    expect(workspaceConfig).toContain("engineStrict: true");
    expect(preflight).toContain('const requiredWranglerVersion = "4.148.0";');
    expect(preflight).toContain("pnpm-workspace.yaml must pin overrides.sharp exactly to 0.35.5");
  });

  test("allows only reviewed Vite patches and keeps the third-party notice accurate", () => {
    const preflight = read("scripts/security-preflight.ts");
    const notices = read("THIRD_PARTY_NOTICES.md");
    expect(preflight).toContain('new Set(["8.3.1", "8.3.3"])');
    expect(preflight).toContain("vite must be pinned exactly to one of:");
    expect(notices).toContain("Browser TypeScript bundling uses Vite 8.3.x.");
  });
});
