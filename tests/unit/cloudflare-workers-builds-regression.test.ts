import { describe, expect, test } from "vitest";
import { existsSync, readFileSync } from "node:fs";

const read = (file: string) => readFileSync(file, "utf8");

describe("Cloudflare Workers Builds deployment", () => {
  test("keeps GitHub Actions CI-only and free of Cloudflare deploy credentials", () => {
    expect(existsSync(".github/workflows/deploy-staging.yml")).toBe(false);
    const ci = read(".github/workflows/ci.yml");
    expect(ci).not.toContain("CLOUDFLARE_API_TOKEN");
    expect(ci).not.toContain("CLOUDFLARE_ACCOUNT_ID");
    expect(ci).not.toContain("wrangler deploy");
    expect(ci).not.toContain("db:migrate:dev");
    expect(ci).not.toContain("db:migrate:staging");
    expect(ci).not.toContain("db:migrate:prod");
  });

  test("defines branch-specific Workers Builds commands for all three environments", () => {
    const pkg = JSON.parse(read("package.json"));
    expect(pkg.scripts["workers:build:dev"]).toContain("workers-build-preflight.ts dev");
    expect(pkg.scripts["workers:build:staging"]).toContain("workers-build-preflight.ts staging");
    expect(pkg.scripts["workers:build:prod"]).toContain("workers-build-preflight.ts production");
    expect(pkg.scripts["workers:build:dev"]).toContain("npm ci --ignore-scripts");
    expect(pkg.scripts["workers:build:prod"]).toContain("npm run ops:preflight");
  });

  test("guards Workers Builds branch mapping and D1 migration baselines", () => {
    const preflight = read("scripts/workers-build-preflight.ts");
    expect(preflight).toContain('dev: "dev"');
    expect(preflight).toContain('staging: "staging"');
    expect(preflight).toContain('production: "main"');
    expect(preflight).toContain("WORKERS_CI_BRANCH");
    expect(preflight).toContain("config/deployment-migrations.json");

    const baselines = JSON.parse(read("config/deployment-migrations.json"));
    expect(baselines.dev).toBe("0025");
    expect(baselines.staging).toBe("0025");
    expect(baselines.production).toBe("0025");
  });

  test("documents Cloudflare-managed deploys without GitHub Cloudflare secrets", () => {
    const docs = read("docs/operations/cloudflare-workers-builds.md");
    expect(docs).toContain("GitHub ActionsはCIだけ");
    expect(docs).toContain("SKIP_DEPENDENCY_INSTALL=1");
    expect(docs).toContain("npm run workers:build:dev");
    expect(docs).toContain("npm run workers:build:staging");
    expect(docs).toContain("npm run workers:build:prod");
    expect(docs).toContain("npm run db:baseline:prod -- --confirm-applied");
  });
});
