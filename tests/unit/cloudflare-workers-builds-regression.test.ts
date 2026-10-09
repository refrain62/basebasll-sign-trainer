import { describe, expect, test } from "vitest";
import { existsSync, readFileSync } from "node:fs";

const read = (file: string) => readFileSync(file, "utf8").replace(/\r\n/g, "\n");

describe("Cloudflare Workers Builds deployment", () => {
  test("keeps direct Cloudflare deployment and API credentials out of GitHub Actions", () => {
    expect(existsSync(".github/workflows/deploy-staging.yml")).toBe(false);
    const ci = read(".github/workflows/ci.yml");
    const manual = read(".github/workflows/manual-deploy.yml");
    for (const workflow of [ci, manual]) {
      expect(workflow).not.toContain("CLOUDFLARE_API_TOKEN");
      expect(workflow).not.toContain("CLOUDFLARE_ACCOUNT_ID");
      expect(workflow).not.toContain("wrangler deploy");
      expect(workflow).not.toContain("db:migrate:dev");
      expect(workflow).not.toContain("db:migrate:staging");
      expect(workflow).not.toContain("db:migrate:prod");
    }
  });

  test("defines branch-specific Workers Builds commands for all three environments", () => {
    const pkg = JSON.parse(read("package.json"));
    expect(pkg.scripts["workers:build:dev"]).toContain("workers-build-preflight.ts dev");
    expect(pkg.scripts["workers:build:staging"]).toContain("workers-build-preflight.ts staging");
    expect(pkg.scripts["workers:build:prod"]).toContain("workers-build-preflight.ts production");
    expect(pkg.scripts["workers:build:dev"]).toContain("npm ci --ignore-scripts");
    expect(pkg.scripts["workers:build:prod"]).toContain("npm run ops:preflight");
  });

  test("builds generated pages before direct deployment", () => {
    const pkg = JSON.parse(read("package.json"));
    const wrangler = JSON.parse(read("wrangler.jsonc"));
    expect(pkg.scripts["deploy:dev"]).toMatch(/^npm run predeploy:dev && wrangler deploy --env dev$/);
    expect(pkg.scripts["deploy:staging"]).toMatch(/^npm run predeploy:staging && wrangler deploy --env staging$/);
    expect(pkg.scripts["deploy:prod"]).toMatch(/^npm run predeploy:prod && wrangler deploy$/);
    expect(wrangler.build.command).toContain("npm run build:client");
    expect(wrangler.build.command).toContain("scripts/client-source-check.ts");
    expect(wrangler.build.watch_dir).toEqual(["client", "pages"]);
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

  test("supports manual Deploy Hook triggers for all environments", () => {
    const manual = read(".github/workflows/manual-deploy.yml");
    expect(manual).toContain("workflow_dispatch:");
    expect(manual).toContain("CLOUDFLARE_DEPLOY_HOOK");
    expect(manual).toContain("environment:\n      name: dev");
    expect(manual).toContain("environment:\n      name: staging");
    expect(manual).toContain("environment:\n      name: production");
    expect(manual).toContain('curl --fail-with-body --silent --show-error --request POST "$DEPLOY_HOOK_URL"');
    expect(manual).toContain("runs-on: ubuntu-24.04");
  });

  test("documents production approval before the production hook is released", () => {
    const docs = read("docs/operations/cloudflare-workers-builds.md");
    expect(docs).toContain("Required reviewers");
    expect(docs).toContain("Prevent self-review");
    expect(docs).toContain("production用`CLOUDFLARE_DEPLOY_HOOK`にもアクセスできません");
    expect(docs).toContain("npm run workers:build:dev");
    expect(docs).toContain("npm run workers:build:staging");
    expect(docs).toContain("npm run workers:build:prod");
    expect(docs).toContain("npm run db:baseline:prod -- --confirm-applied");
  });
});
