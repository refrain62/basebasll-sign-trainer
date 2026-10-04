import { describe, expect, test } from "vitest";
import { readFileSync } from "node:fs";

const read = (file: string) => readFileSync(file, "utf8");

describe("documentation compatibility paths", () => {
  test("registers dependency policy and all legacy root compatibility docs", () => {
    const index = read("docs/INDEX.md");
    for (const path of [
      "engineering/dependencies.md",
      "CLOUDFLARE_ENVIRONMENT_RUNBOOK.md",
      "architecture.md",
      "data-protection.md",
      "design.md",
      "monetization.md",
      "operations.md",
      "security-hardening.md",
      "spec.md",
      "testing.md"
    ]) {
      expect(index).toContain(`(${path})`);
    }
  });

  test("legacy root docs are redirects instead of stale copies", () => {
    expect(read("docs/architecture.md")).toContain("engineering/architecture.md");
    expect(read("docs/data-protection.md")).toContain("security/data-protection.md");
    expect(read("docs/design.md")).toContain("design/ui.md");
    expect(read("docs/monetization.md")).toContain("product/plans.md");
    expect(read("docs/security-hardening.md")).toContain("security/hardening.md");
    expect(read("docs/spec.md")).toContain("product/spec.md");
    expect(read("docs/testing.md")).toContain("engineering/testing.md");
  });

  test("dependency policy is aligned to Node 24", () => {
    const dependencies = read("docs/engineering/dependencies.md");
    expect(dependencies).toContain("Node.js 24");
    expect(dependencies).toContain("40桁の小文字");
    expect(dependencies).toContain("# vMAJOR.MINOR.PATCH");
    expect(dependencies).toContain("公式リポジトリ");
    expect(dependencies).toContain("リリースタグ");
    expect(dependencies).not.toContain("Node.jsは **22系**");
  });
});
