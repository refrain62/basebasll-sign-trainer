import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

type Impact = "none" | "minor" | "major";
type ChangeDeclaration = {
  id: string;
  summary: string;
  impact: Impact;
  docs: string[];
  docsReason?: string;
  noticeMigration: string | null;
};

const failures: string[] = [];
const changeDir = "changes";
const declarationFiles = fs.existsSync(changeDir)
  ? fs.readdirSync(changeDir).filter((name) => name.endsWith(".json")).map((name) => `${changeDir}/${name}`)
  : [];

function readDeclaration(file: string): ChangeDeclaration | null {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8")) as ChangeDeclaration;
  } catch (error) {
    failures.push(`${file}: invalid JSON (${String(error)})`);
    return null;
  }
}

function validateDeclaration(file: string, item: ChangeDeclaration): void {
  if (!item.id?.trim()) failures.push(`${file}: id is required`);
  if (!item.summary?.trim()) failures.push(`${file}: summary is required`);
  if (!new Set<Impact>(["none", "minor", "major"]).has(item.impact)) failures.push(`${file}: impact must be none, minor, or major`);
  if (!Array.isArray(item.docs)) failures.push(`${file}: docs must be an array`);
  else {
    for (const doc of item.docs) if (!fs.existsSync(doc)) failures.push(`${file}: docs entry does not exist: ${doc}`);
    if (item.impact !== "none" && item.docs.length === 0 && !item.docsReason?.trim()) {
      failures.push(`${file}: user-facing changes need docs[] or a docsReason`);
    }
  }

  if (item.impact === "major") {
    if (!item.noticeMigration) {
      failures.push(`${file}: major user-facing change requires noticeMigration`);
      return;
    }
    if (!/^migrations\/\d{4}_notice_[a-z0-9-]+\.sql$/.test(item.noticeMigration)) {
      failures.push(`${file}: noticeMigration must use migrations/NNNN_notice_slug.sql`);
      return;
    }
    if (!fs.existsSync(item.noticeMigration)) {
      failures.push(`${file}: noticeMigration does not exist: ${item.noticeMigration}`);
      return;
    }
    const sql = fs.readFileSync(item.noticeMigration, "utf8");
    if (!/INSERT\s+INTO\s+system_notices/i.test(sql)) failures.push(`${item.noticeMigration}: must INSERT INTO system_notices`);
    if (!/["']?published["']?/i.test(sql)) failures.push(`${item.noticeMigration}: notice must be published`);
    if (!/["'](?:update|important)["']/i.test(sql)) failures.push(`${item.noticeMigration}: notice kind must be update or important`);
  }
}

const declarations = new Map<string, ChangeDeclaration>();
for (const file of declarationFiles) {
  const item = readDeclaration(file);
  if (!item) continue;
  if (declarations.has(item.id)) failures.push(`${file}: duplicate id ${item.id}`);
  declarations.set(item.id, item);
  validateDeclaration(file, item);
}

function git(args: string[]): string[] {
  try {
    return execFileSync("git", args, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] })
      .split(/\r?\n/).map((line) => line.trim()).filter(Boolean).map((line) => line.replaceAll("\\", "/"));
  } catch {
    return [];
  }
}

const ciMode = process.argv.includes("--ci");
if (ciMode) {
  const base = process.env.RELEASE_BASE_REF?.trim();
  if (!base) failures.push("--ci requires RELEASE_BASE_REF (for example origin/main)");
  const changed = base ? git(["diff", "--name-only", `${base}...HEAD`]) : [];
  if (base && changed.length === 0) failures.push(`could not resolve a non-empty git diff from ${base}...HEAD`);

  const userFacing = changed.filter((file) =>
    file.startsWith("client/") ||
    file.startsWith("pages/") ||
    file.startsWith("src/controllers/") ||
    file.startsWith("src/services/") ||
    file === "public/styles.css" ||
    file === "public/lp-refresh.css" ||
    file === "public/install-refresh.css" ||
    file === "public/manifest.webmanifest"
  );
  const changedDeclarations = changed.filter((file) => /^changes\/[^/]+\.json$/.test(file));

  if (userFacing.length && changedDeclarations.length === 0) {
    failures.push(`user-facing files changed but no changes/*.json declaration was added/updated: ${userFacing.join(", ")}`);
  }

  for (const file of changedDeclarations) {
    if (!fs.existsSync(file)) continue;
    const item = readDeclaration(file);
    if (!item) continue;
    validateDeclaration(file, item);
    if (item.impact === "major" && item.noticeMigration && !changed.includes(item.noticeMigration)) {
      failures.push(`${file}: major notice migration must be part of the same PR diff: ${item.noticeMigration}`);
    }
  }
}

if (failures.length) {
  console.error("Release policy check failed:\n- " + [...new Set(failures)].join("\n- "));
  process.exit(1);
}
console.log(`Release policy check passed (${declarationFiles.length} stored change declarations${ciMode ? ", CI diff checked" : ""}).`);
