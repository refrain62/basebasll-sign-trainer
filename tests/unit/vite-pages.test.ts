import { test } from "vitest";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { PAGE_ENTRIES, renderVitePages } from "../../scripts/render-vite-pages.ts";
import { validateRenderedPages, validateViteManifest } from "../../scripts/client-artifact-check.ts";

function createFixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "sign-trainer-vite-pages-"));
  fs.mkdirSync(path.join(root, "pages", "components"), { recursive: true });
  fs.mkdirSync(path.join(root, "public", "build", "assets"), { recursive: true });
  for (const component of ["site-header.html", "site-footer.html", "pricing-cards.html", "lp-footer-cta.html"]) {
    fs.writeFileSync(path.join(root, "pages", "components", component), `<div data-test-component="${component}"></div>`);
  }

  const entries: Record<string, string> = {};
  for (const [page, entry] of Object.entries(PAGE_ENTRIES)) {
    fs.writeFileSync(path.join(root, "pages", `${page}.html`), `<html><!-- VITE_ENTRY:${entry} --></html>`);
    entries[entry] ||= `assets/${entry}-abc123.js`;
  }

  for (const entryFile of Object.values(entries)) fs.writeFileSync(path.join(root, "public", "build", entryFile), "export {};\n");
  return { root, entries };
}

test("Vite page renderer injects hashed entry URLs into every Worker page snapshot", () => {
  const { root, entries } = createFixture();
  renderVitePages(entries, root);
  const index = fs.readFileSync(path.join(root, "public", "index.html"), "utf8");
  const snapshot = fs.readFileSync(path.join(root, "public", "__pages", "index.txt"), "utf8");
  assert.equal(index, snapshot);
  assert.match(index, /<script src="\/build\/assets\/landing-abc123\.js" type="module"><\/script>/);
  assert.doesNotMatch(index, /VITE_ENTRY/);
  assert.deepEqual(validateRenderedPages(root), []);
});

test("rendered page validation detects missing snapshots and hashed scripts", () => {
  const { root, entries } = createFixture();
  renderVitePages(entries, root);

  fs.rmSync(path.join(root, "public", "__pages", "contact.txt"));
  fs.rmSync(path.join(root, "public", "build", "assets", "landing-abc123.js"));

  const failures = validateRenderedPages(root);
  assert.ok(failures.includes("worker page snapshot missing: public/__pages/contact.txt"));
  assert.ok(failures.some((failure) => failure.includes("generated page script missing: public/build/assets/landing-abc123.js")));
});

test("rendered page validation rejects a stale hash that is absent from the manifest", () => {
  const { root, entries } = createFixture();
  renderVitePages(entries, root);
  fs.writeFileSync(path.join(root, "public", "build", "manifest.json"), JSON.stringify({
    "client/landing.ts": { file: "assets/landing-abc123.js", name: "landing", isEntry: true }
  }));
  const generated = path.join(root, "public", "index.html");
  const snapshot = path.join(root, "public", "__pages", "index.txt");
  const staleHtml = fs.readFileSync(generated, "utf8").replace("landing-abc123.js", "landing-stale.js");
  fs.writeFileSync(generated, staleHtml);
  fs.writeFileSync(snapshot, staleHtml);
  fs.writeFileSync(path.join(root, "public", "build", "assets", "landing-stale.js"), "export {};\n");

  const failures = validateRenderedPages(root);
  assert.ok(failures.some((failure) => failure.includes("generated page script is not listed in Vite manifest: assets/landing-stale.js")));
});

test("Vite manifest validation follows imported chunks and CSS assets", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "sign-trainer-vite-manifest-"));
  const buildDir = path.join(root, "public", "build");
  fs.mkdirSync(path.join(buildDir, "assets"), { recursive: true });

  const manifest: Record<string, Record<string, unknown>> = {
    "shared.js": { file: "assets/shared-abc123.js" }
  };
  fs.writeFileSync(path.join(buildDir, "assets", "shared-abc123.js"), "export {};\n");
  fs.writeFileSync(path.join(buildDir, "assets", "site-abc123.css"), "body {}\n");

  for (const name of new Set(Object.values(PAGE_ENTRIES))) {
    const key = `client/${name}.ts`;
    manifest[key] = {
      file: `assets/${name}-abc123.js`,
      name,
      src: key,
      isEntry: true,
      imports: ["shared.js"],
      css: ["assets/site-abc123.css"]
    };
    fs.writeFileSync(path.join(buildDir, "assets", `${name}-abc123.js`), "export {};\n");
  }
  fs.writeFileSync(path.join(buildDir, "manifest.json"), JSON.stringify(manifest));

  assert.deepEqual(validateViteManifest(root), []);
  fs.rmSync(path.join(buildDir, "assets", "site-abc123.css"));
  assert.ok(validateViteManifest(root).some((failure) => failure.includes("Vite referenced asset missing")));
});
