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
  legal: "legal",
  contact: "legal",
  support: "landing"
} as const;

const SHARED_COMPONENTS = {
  SITE_HEADER: "site-header.html",
  SITE_FOOTER: "site-footer.html",
  PRICING_CARDS: "pricing-cards.html",
  LP_FOOTER_CTA: "lp-footer-cta.html"
} as const;

function injectSharedComponents(template: string, pagesDir: string): string {
  let html = template;
  for (const [key, fileName] of Object.entries(SHARED_COMPONENTS)) {
    const componentPath = path.join(pagesDir, "components", fileName);
    if (!fs.existsSync(componentPath)) throw new Error(`Shared page component not found: ${componentPath}`);
    const component = fs.readFileSync(componentPath, "utf8").trim();

    // Preferred form: keep a rendered fallback between START/END markers so the
    // template still looks correct when opened directly, while build output is
    // always refreshed from the canonical component file.
    const start = `<!-- ${key}_START -->`;
    const end = `<!-- ${key}_END -->`;
    const blockPattern = new RegExp(`${start.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}[\\s\\S]*?${end.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, "g");
    if (html.includes(start) && html.includes(end)) {
      html = html.replace(blockPattern, `${start}\n${component}\n${end}`);
      continue;
    }

    // Backward compatibility with older one-line markers.
    const legacy = `<!-- ${key} -->`;
    if (html.includes(legacy)) html = html.replaceAll(legacy, component);
  }
  return html;
}

export function renderVitePages(entryFiles: Readonly<Record<string, string>>, rootDir = process.cwd()): void {
  const publicDir = path.join(rootDir, "public");
  const pagesDir = path.join(rootDir, "pages");
  fs.mkdirSync(path.join(publicDir, "__pages"), { recursive: true });

  for (const [pageName, entryName] of Object.entries(PAGE_ENTRIES)) {
    const entryFile = entryFiles[entryName];
    if (!entryFile) throw new Error(`Vite entry output not found: ${entryName}`);

    const templatePath = path.join(pagesDir, `${pageName}.html`);
    const marker = `<!-- VITE_ENTRY:${entryName} -->`;
    const template = injectSharedComponents(fs.readFileSync(templatePath, "utf8"), pagesDir);
    if (!template.includes(marker)) throw new Error(`${templatePath} is missing ${marker}`);

    const entryUrl = entryFile.startsWith("/") ? entryFile : `/build/${entryFile}`;
    const html = template.replace(marker, `<script src="${entryUrl}" type="module"></script>`);
    fs.writeFileSync(path.join(publicDir, `${pageName}.html`), html);
    fs.writeFileSync(path.join(publicDir, "__pages", `${pageName}.txt`), html);
  }
}
