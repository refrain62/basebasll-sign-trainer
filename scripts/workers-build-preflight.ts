import fs from "node:fs";
import path from "node:path";

type Target = "dev" | "staging" | "production";

interface WranglerEnvironment {
  vars?: Record<string, unknown>;
}

interface WranglerConfig {
  vars?: Record<string, unknown>;
  env?: Record<string, WranglerEnvironment>;
}

interface MigrationBaselines {
  dev?: string;
  staging?: string;
  production?: string;
}

const target = String(process.argv[2] || "").trim() as Target;
const allowedTargets = new Set<Target>(["dev", "staging", "production"]);

if (!allowedTargets.has(target)) {
  console.error("Usage: node --experimental-strip-types scripts/workers-build-preflight.ts <dev|staging|production>");
  process.exit(1);
}

const expectedBranch: Record<Target, string> = {
  dev: "dev",
  staging: "staging",
  production: "main"
};

const root = process.cwd();
const failures: string[] = [];
const wrangler = JSON.parse(fs.readFileSync(path.join(root, "wrangler.jsonc"), "utf8")) as WranglerConfig;
const configuredEnvironment = target === "production"
  ? String(wrangler.vars?.ENVIRONMENT || "")
  : String(wrangler.env?.[target]?.vars?.ENVIRONMENT || "");

if (configuredEnvironment !== target) {
  failures.push(`wrangler.jsonc environment mismatch: expected ${target}, got ${configuredEnvironment || "(empty)"}`);
}

const migrationsDir = path.join(root, "migrations");
const migrationFiles = fs.readdirSync(migrationsDir)
  .filter((name) => /^\d{4}_.+\.sql$/.test(name))
  .sort();
const latestMigration = migrationFiles.at(-1)?.slice(0, 4) || "0000";
const baselines = JSON.parse(fs.readFileSync(path.join(root, "config/deployment-migrations.json"), "utf8")) as MigrationBaselines;
const baseline = String(baselines[target] || "");

if (baseline !== latestMigration) {
  failures.push(
    `D1 migration gate is not ready for ${target}: repository latest=${latestMigration}, acknowledged=${baseline || "(none)"}. ` +
    `Apply the remote D1 migration with local Wrangler OAuth, then run npm run db:baseline:${target === "production" ? "prod" : target} -- --confirm-applied and commit the baseline change before deploy.`
  );
}

const workersCi = process.env.WORKERS_CI === "1" || process.env.WORKERS_CI === "true";
if (workersCi) {
  const branch = String(process.env.WORKERS_CI_BRANCH || "").trim();
  if (!branch) {
    failures.push("Workers Builds did not provide WORKERS_CI_BRANCH");
  } else if (branch !== expectedBranch[target]) {
    failures.push(`Workers Builds branch mismatch for ${target}: expected ${expectedBranch[target]}, got ${branch}`);
  }
}

if (failures.length) {
  console.error(`Workers Builds preflight failed for ${target}:\n- ${failures.join("\n- ")}`);
  process.exit(1);
}

console.log(
  `Workers Builds preflight passed for ${target}: branch=${workersCi ? expectedBranch[target] : "local/manual"}, migration=${latestMigration}.`
);
