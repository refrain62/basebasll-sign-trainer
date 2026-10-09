import fs from "node:fs";
import path from "node:path";
import { PAGE_ENTRIES } from "./render-vite-pages.ts";

interface ManifestEntry {
  name?: string;
  file?: string;
  src?: string;
  isEntry?: boolean;
  imports?: string[];
  dynamicImports?: string[];
  css?: string[];
  assets?: string[];
}

type Manifest = Record<string, ManifestEntry>;

function manifestEntryName(key: string, item: ManifestEntry): string {
  return item.name || path.basename(item.src || key).replace(/\.[^.]+$/, "");
}

function buildFilePath(publicDir: string, relativePath: string): string | null {
  const buildDir = path.resolve(publicDir, "build");
  const resolved = path.resolve(buildDir, relativePath);
  if (resolved !== buildDir && !resolved.startsWith(`${buildDir}${path.sep}`)) return null;
  return resolved;
}

function checkBuildFile(publicDir: string, relativePath: string, label: string): string | null {
  const filePath = buildFilePath(publicDir, relativePath);
  if (!filePath || !fs.existsSync(filePath)) return `${label}: public/build/${relativePath}`;
  return null;
}

function manifestOutputFiles(rootDir: string): Set<string> | null {
  const manifestPath = path.join(rootDir, "public", "build", "manifest.json");
  if (!fs.existsSync(manifestPath)) return null;
  try {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8")) as Manifest;
    return new Set(Object.values(manifest).flatMap((item) => item.file ? [item.file] : []));
  } catch {
    return null;
  }
}

function manifestEntryFiles(rootDir: string): Map<string, string> | null {
  const manifestPath = path.join(rootDir, "public", "build", "manifest.json");
  if (!fs.existsSync(manifestPath)) return null;
  try {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8")) as Manifest;
    return new Map(Object.entries(manifest)
      .filter(([, item]) => Boolean(item.isEntry && item.file))
      .map(([key, item]) => [manifestEntryName(key, item), item.file as string]));
  } catch {
    return null;
  }
}

export function validateViteManifest(rootDir = process.cwd()): string[] {
  const publicDir = path.join(rootDir, "public");
  const manifestPath = path.join(publicDir, "build", "manifest.json");
  const failures: string[] = [];

  if (!fs.existsSync(manifestPath)) {
    return ["Vite manifest is missing. Run `pnpm run build:client` first."];
  }

  let manifest: Manifest;
  try {
    manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8")) as Manifest;
  } catch (error) {
    failures.push(`Vite manifest could not be parsed: ${error instanceof Error ? error.message : String(error)}`);
    return failures;
  }

  const entryNames = new Set(Object.entries(manifest)
    .filter(([, item]) => item.isEntry)
    .map(([key, item]) => manifestEntryName(key, item)));
  const expectedEntries = new Set(Object.values(PAGE_ENTRIES));
  for (const name of expectedEntries) {
    if (!entryNames.has(name)) failures.push(`Vite entry missing from manifest: ${name}`);
  }

  for (const [key, item] of Object.entries(manifest)) {
    if (!item.file) {
      failures.push(`Vite manifest entry has no output file: ${key}`);
      continue;
    }

    const outputFailure = checkBuildFile(publicDir, item.file, "Vite output missing");
    if (outputFailure) failures.push(outputFailure);

    for (const importedKey of [...(item.imports || []), ...(item.dynamicImports || [])]) {
      if (!manifest[importedKey]) {
        failures.push(`Vite manifest import missing: ${key} -> ${importedKey}`);
      }
    }

    for (const asset of [...(item.css || []), ...(item.assets || [])]) {
      const assetFailure = checkBuildFile(publicDir, asset, "Vite referenced asset missing");
      if (assetFailure) failures.push(`${assetFailure} (from ${key})`);
    }
  }

  return failures;
}

function validatePageScriptReferences(
  publicDir: string,
  pageName: string,
  html: string,
  manifestFiles: Set<string> | null,
  expectedEntryFile: string | undefined
): string[] {
  const failures: string[] = [];
  if (html.includes("VITE_ENTRY:")) failures.push(`unrendered Vite entry marker remains: ${pageName}`);

  const scriptSources = [...html.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi)]
    .map((match) => match[1]);
  if (!scriptSources.length) {
    failures.push(`generated page has no client script: ${pageName}`);
    return failures;
  }

  for (const source of scriptSources) {
    const pathname = source.split(/[?#]/, 1)[0];
    if (!pathname.startsWith("/build/")) {
      failures.push(`generated page script must use a Vite build asset: ${source} (from ${pageName})`);
      continue;
    }
    const relativePath = pathname.slice("/build/".length);
    if (!buildFilePath(publicDir, relativePath)) {
      failures.push(`generated page script escapes public/build: ${source} (from ${pageName})`);
      continue;
    }
    const missing = checkBuildFile(publicDir, relativePath, "generated page script missing");
    if (missing) failures.push(`${missing} (from ${pageName})`);
    else {
      if (expectedEntryFile && relativePath !== expectedEntryFile) {
        failures.push(`generated page script does not match Vite entry: expected ${expectedEntryFile}, got ${relativePath} (from ${pageName})`);
      }
      if (manifestFiles && !manifestFiles.has(relativePath)) {
        failures.push(`generated page script is not listed in Vite manifest: ${relativePath} (from ${pageName})`);
      }
    }
  }

  return failures;
}

export function validateRenderedPages(rootDir = process.cwd()): string[] {
  const publicDir = path.join(rootDir, "public");
  const pagesDir = path.join(rootDir, "pages");
  const manifestFiles = manifestOutputFiles(rootDir);
  const manifestEntries = manifestEntryFiles(rootDir);
  const failures: string[] = [];

  for (const pageName of Object.keys(PAGE_ENTRIES)) {
    const template = path.join(pagesDir, `${pageName}.html`);
    const generated = path.join(publicDir, `${pageName}.html`);
    const snapshot = path.join(publicDir, "__pages", `${pageName}.txt`);
    if (!fs.existsSync(template)) failures.push(`page template missing: pages/${pageName}.html`);
    if (!fs.existsSync(generated)) failures.push(`generated page missing: public/${pageName}.html`);
    if (!fs.existsSync(snapshot)) failures.push(`worker page snapshot missing: public/__pages/${pageName}.txt`);
    if (!fs.existsSync(generated) || !fs.existsSync(snapshot)) continue;

    const html = fs.readFileSync(generated, "utf8");
    const snapshotHtml = fs.readFileSync(snapshot, "utf8");
    if (html !== snapshotHtml) failures.push(`generated page and worker snapshot differ: ${pageName}`);
    const expectedEntryName = PAGE_ENTRIES[pageName as keyof typeof PAGE_ENTRIES];
    const expectedEntryFile = manifestEntries?.get(expectedEntryName);
    failures.push(...validatePageScriptReferences(publicDir, pageName, html, manifestFiles, expectedEntryFile));
  }

  return failures;
}

export function validateClientArtifacts(rootDir = process.cwd()): string[] {
  return [
    ...validateViteManifest(rootDir),
    ...validateRenderedPages(rootDir)
  ];
}
