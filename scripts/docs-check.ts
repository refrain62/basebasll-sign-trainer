import fs from "node:fs";
import path from "node:path";

const failures: string[] = [];
const rootReadme = fs.readFileSync("README.md", "utf8");
const readmeLines = rootReadme.split(/\r?\n/).length;
if (readmeLines > 180) failures.push(`README.md is ${readmeLines} lines; keep the entry README at 180 lines or fewer`);

const indexPath = "docs/INDEX.md";
if (!fs.existsSync(indexPath)) failures.push(`${indexPath} is required`);
const index = fs.existsSync(indexPath) ? fs.readFileSync(indexPath, "utf8") : "";

const walk = (dir: string): string[] => fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
  const full = path.join(dir, entry.name);
  return entry.isDirectory() ? walk(full) : [full.replaceAll("\\", "/")];
});

for (const file of walk("docs").filter((name) => name.endsWith(".md") && name !== indexPath)) {
  const relative = file.slice("docs/".length);
  if (!index.includes(`(${relative})`)) failures.push(`${file}: not registered in docs/INDEX.md`);
}

const markdownFiles = ["README.md", "AGENTS.md", ...walk("docs").filter((name) => name.endsWith(".md") && !name.startsWith("docs/history/"))];
const linkPattern = /\[[^\]]*\]\(([^)]+\.md)(?:#[^)]+)?\)/g;
for (const file of markdownFiles) {
  const source = fs.readFileSync(file, "utf8");
  let match: RegExpExecArray | null;
  while ((match = linkPattern.exec(source))) {
    const href = match[1];
    if (/^[a-z]+:\/\//i.test(href)) continue;
    const target = path.resolve(path.dirname(file), href);
    if (!fs.existsSync(target)) failures.push(`${file}: broken markdown link -> ${href}`);
  }
}

if (failures.length) {
  console.error("Documentation check failed:\n- " + failures.join("\n- "));
  process.exit(1);
}
console.log(`Documentation check passed: README=${readmeLines} lines and docs/INDEX.md covers all purpose docs.`);
