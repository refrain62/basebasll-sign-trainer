import fs from "node:fs";
import path from "node:path";

const failures: string[] = [];
const read = (file: string): string => fs.readFileSync(file, "utf8");
const files = (dir: string): string[] => fs.readdirSync(dir)
  .filter((name) => name.endsWith(".ts"))
  .map((name) => path.join(dir, name));

for (const file of files("src/services")) {
  if (file.endsWith("service-factory.ts")) continue;
  const source = read(file);
  if (/\benv\.DB\b|\.prepare\s*\(/.test(source)) failures.push(`${file}: service must not access D1 directly`);
  if (/\bRequest\b|\bResponse\b|apiJson\s*\(/.test(source)) failures.push(`${file}: service must not depend on HTTP primitives`);
}

for (const file of files("src/controllers")) {
  const source = read(file);
  if (/\.prepare\s*\(/.test(source)) failures.push(`${file}: controller must use repositories/services instead of SQL`);
}

for (const file of files("src/routes")) {
  const source = read(file);
  if (source.includes("../backend.ts")) failures.push(`${file}: route must import focused controller/module, not backend facade`);
  if (/\.prepare\s*\(/.test(source)) failures.push(`${file}: route must not access D1`);
}

const repositorySource = files("src/repositories").map(read).join("\n");
if (!repositorySource.includes(".prepare(")) failures.push("repositories: expected D1 access was not found");

const backendLines = read("src/backend.ts").split(/\r?\n/).length;
if (backendLines > 100) failures.push(`src/backend.ts: compatibility facade grew to ${backendLines} lines; keep business logic out`);

if (failures.length) {
  console.error("Architecture check failed:\n- " + failures.join("\n- "));
  process.exit(1);
}
console.log("Architecture check passed: routes/controllers/services/repositories boundaries are intact.");
