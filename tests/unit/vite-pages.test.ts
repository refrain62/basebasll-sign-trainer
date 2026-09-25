import { test } from "vitest";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { PAGE_ENTRIES, renderVitePages } from "../../scripts/render-vite-pages.ts";

test("Vite page renderer injects hashed entry URLs into Worker page snapshots", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "sign-trainer-vite-pages-"));
  fs.mkdirSync(path.join(root, "pages"), { recursive: true });
  fs.mkdirSync(path.join(root, "public"), { recursive: true });

  const entries: Record<string, string> = {};
  for (const [page, entry] of Object.entries(PAGE_ENTRIES)) {
    fs.writeFileSync(path.join(root, "pages", `${page}.html`), `<html><!-- VITE_ENTRY:${entry} --></html>`);
    entries[entry] ||= `assets/${entry}-abc123.js`;
  }

  renderVitePages(entries, root);
  const index = fs.readFileSync(path.join(root, "public", "index.html"), "utf8");
  const snapshot = fs.readFileSync(path.join(root, "public", "__pages", "index.txt"), "utf8");
  assert.equal(index, snapshot);
  assert.match(index, /<script src="\/build\/assets\/landing-abc123\.js" type="module"><\/script>/);
  assert.doesNotMatch(index, /VITE_ENTRY/);
});
