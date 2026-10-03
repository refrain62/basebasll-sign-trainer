import fs from "node:fs";
import path from "node:path";

type Target = "dev" | "staging" | "production";

const target = String(process.argv[2] || "").trim() as Target;
const allowedTargets = new Set<Target>(["dev", "staging", "production"]);
const confirmed = process.argv.includes("--confirm-applied");

if (!allowedTargets.has(target)) {
  console.error("Usage: node --experimental-strip-types scripts/mark-migration-baseline.ts <dev|staging|production> --confirm-applied");
  process.exit(1);
}
if (!confirmed) {
  console.error("Refusing to update the deployment baseline without --confirm-applied.");
  console.error(`First apply and verify the remote D1 migrations for ${target}, then rerun with --confirm-applied.`);
  process.exit(1);
}

const root = process.cwd();
const migrationFiles = fs.readdirSync(path.join(root, "migrations"))
  .filter((name) => /^\d{4}_.+\.sql$/.test(name))
  .sort();
const latestMigration = migrationFiles.at(-1)?.slice(0, 4);
if (!latestMigration) {
  console.error("No numbered D1 migration files were found.");
  process.exit(1);
}

const baselinePath = path.join(root, "config/deployment-migrations.json");
const baselines = JSON.parse(fs.readFileSync(baselinePath, "utf8")) as Record<Target, string>;
baselines[target] = latestMigration;
fs.writeFileSync(baselinePath, `${JSON.stringify(baselines, null, 2)}\n`);
console.log(`Marked ${target} D1 migration baseline at ${latestMigration}. Commit config/deployment-migrations.json before the target branch deploy.`);
