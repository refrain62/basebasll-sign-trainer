import fs from "node:fs";
import path from "node:path";

export const PAGE_ENTRIES = {
  index: "landing",
  plans: "landing",
  install: "landing",
  team: "team",
  admin: "admin-entry",
  account: "account",
  terms: "legal",
  privacy: "legal",
  "external-transmission": "legal",
  support: "landing"
} as const;

export function renderVitePages(entryFiles: Readonly<Record<string, string>>, rootDir = process.cwd()): void {
  const publicDir = path.join(rootDir, "public");
  const pagesDir = path.join(rootDir, "pages");
  fs.mkdirSync(path.join(publicDir, "__pages"), { recursive: true });

  for (const [pageName, entryName] of Object.entries(PAGE_ENTRIES)) {
    const entryFile = entryFiles[entryName];
    if (!entryFile) throw new Error(`Vite entry output not found: ${entryName}`);

    const templatePath = path.join(pagesDir, `${pageName}.html`);
    const marker = `<!-- VITE_ENTRY:${entryName} -->`;
    const template = fs.readFileSync(templatePath, "utf8");
    if (!template.includes(marker)) throw new Error(`${templatePath} is missing ${marker}`);

    const entryUrl = entryFile.startsWith("/") ? entryFile : `/build/${entryFile}`;
    const html = template.replace(marker, `<script src="${entryUrl}" type="module"></script>`);
    fs.writeFileSync(path.join(publicDir, `${pageName}.html`), html);
    fs.writeFileSync(path.join(publicDir, "__pages", `${pageName}.txt`), html);
  }
}
