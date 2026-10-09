import fs from "node:fs";
import path from "node:path";

function arg(name: string): string {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? String(process.argv[index + 1] || "").trim() : "";
}

const slug = arg("slug").toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "");
const title = arg("title");
const body = arg("body");
const kind = arg("kind") || "update";
const publishAt = arg("publish-at");

if (!slug || !title || !body) {
  console.error('Usage: pnpm run release:notice -- --slug feature-name --title "お知らせタイトル" --body "利用者向け説明" [--kind update|important] [--publish-at 2026-09-26T00:00:00Z]');
  process.exit(1);
}
if (!new Set(["update", "important"]).has(kind)) {
  console.error("--kind must be update or important");
  process.exit(1);
}
if (publishAt && Number.isNaN(Date.parse(publishAt))) {
  console.error("--publish-at must be an ISO date/time such as 2026-09-26T00:00:00Z");
  process.exit(1);
}

const migrationDir = "migrations";
const numbers = fs.readdirSync(migrationDir)
  .map((name) => Number(/^([0-9]{4})_/.exec(name)?.[1] || 0))
  .filter(Boolean);
const next = String(Math.max(...numbers, 0) + 1).padStart(4, "0");
const file = path.join(migrationDir, `${next}_notice_${slug}.sql`);
const sqlEscape = (value: string) => value.replaceAll("'", "''");
const publishSql = publishAt ? `'${sqlEscape(new Date(publishAt).toISOString())}'` : "CURRENT_TIMESTAMP";

const source = `-- User-facing release notice. Keep this migration immutable after deployment.\nINSERT INTO system_notices(\n  title, body, kind, status, publish_at, expires_at, updated_at\n) VALUES (\n  '${sqlEscape(title)}',\n  '${sqlEscape(body)}',\n  '${kind}',\n  'published',\n  ${publishSql},\n  NULL,\n  CURRENT_TIMESTAMP\n);\n`;
fs.writeFileSync(file, source, { flag: "wx" });
console.log(`Created ${file}`);
console.log("Add this path to noticeMigration in the matching changes/*.json declaration.");
