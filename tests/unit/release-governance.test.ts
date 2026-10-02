import { describe, expect, test } from "vitest";
import { readFileSync } from "node:fs";

const read = (file: string) => readFileSync(file, "utf8");

describe("documentation and release governance", () => {
  test("keeps the root README as an index rather than a build-history dump", () => {
    const readme = read("README.md");
    expect(readme.split(/\r?\n/).length).toBeLessThanOrEqual(180);
    expect(readme).toContain("docs/INDEX.md");
    expect(readme).toContain("docs/engineering/change-policy.md");
  });

  test("runs documentation and release-policy guards from the normal tooling check", () => {
    const pkg = JSON.parse(read("package.json"));
    expect(pkg.scripts["tooling:check"]).toContain("scripts/docs-check.ts");
    expect(pkg.scripts["tooling:check"]).toContain("scripts/release-policy-check.ts");
    expect(pkg.scripts["predeploy:prod"]).toContain("release:policy");
  });

  test("CI checks change declarations on pull requests and direct pushes", () => {
    const workflow = read(".github/workflows/ci.yml");
    expect(workflow).toContain("fetch-depth: 0");
    expect(workflow).toContain("npm run release:policy:ci");
    expect(workflow).toContain("github.event.before");
  });

  test("major user-facing changes require a published SYSTEM notice migration", () => {
    const policy = read("scripts/release-policy-check.ts");
    expect(policy).toContain('item.impact === "major"');
    expect(policy).toContain("INSERT\\s+INTO\\s+system_notices");
    expect(policy).toContain("noticeMigration");
    expect(read("AGENTS.md")).toContain('impact: "major"');
  });
});
