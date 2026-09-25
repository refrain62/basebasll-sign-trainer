import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  ASSET_VERSION_TOKEN,
  applyAssetVersion,
  assetVersion,
  isVersionedTextAsset,
  serveVersionedTextAsset
} from "../../src/http/versioned-assets.js";
import { serveHtmlPage } from "../../src/http/pages.js";

test("asset version comes from Cloudflare Worker version metadata", () => {
  assert.equal(assetVersion({ CF_VERSION_METADATA: { id: "12345678-abcd-ef00-1234-56789abcdef0" } }), "12345678-abcd-ef00-1234-56789abcdef0");
  assert.equal(assetVersion({ CF_VERSION_METADATA: { tag: "release 79" } }), "release%2079");
  assert.equal(assetVersion({}), "dev");
});

test("asset version token is replaced without changing source files per release", () => {
  const source = `/styles.css?v=${ASSET_VERSION_TOKEN}`;
  assert.equal(
    applyAssetVersion(source, { CF_VERSION_METADATA: { id: "worker-version-abc" } }),
    "/styles.css?v=worker-version-abc"
  );
});

test("only first-party text assets that can contain version tokens are transformed", () => {
  assert.equal(isVersionedTextAsset("/landing.js"), true);
  assert.equal(isVersionedTextAsset("/styles.css"), true);
  assert.equal(isVersionedTextAsset("/manifest.webmanifest"), true);
  assert.equal(isVersionedTextAsset("/favicon-32.png"), false);
});

test("versioned text asset responses replace tokens and are not cached stale", async () => {
  const env = {
    CF_VERSION_METADATA: { id: "version-abc" },
    ASSETS: {
      async fetch() {
        return new Response(`import \"./dep.js?v=${ASSET_VERSION_TOKEN}\";`, {
          headers: { "content-type": "text/javascript", etag: '"source-etag"' }
        });
      }
    }
  };
  const response = await serveVersionedTextAsset(new Request("https://example.test/app.js?v=version-abc"), env);
  assert.equal(await response.text(), 'import "./dep.js?v=version-abc";');
  assert.equal(response.headers.get("cache-control"), "no-cache, no-store, must-revalidate");
  assert.equal(response.headers.has("etag"), false);
});

test("public sources contain no manually numbered cache-buster", () => {
  const root = path.resolve("public");
  const allowed = new Set([".html", ".txt", ".js", ".css", ".webmanifest"]);
  const files = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.isFile() && allowed.has(path.extname(entry.name))) files.push(full);
    }
  };
  walk(root);
  for (const file of files) {
    const source = fs.readFileSync(file, "utf8");
    assert.doesNotMatch(source, /\?v=\d+/, `${file} must not hard-code ?v=<number>`);
  }
});


test("HTML page responses receive the same Worker version automatically", async () => {
  const env = {
    CF_VERSION_METADATA: { id: "version-html-123" },
    ASSETS: {
      async fetch() {
        return new Response(`<link rel="stylesheet" href="/styles.css?v=${ASSET_VERSION_TOKEN}">`, {
          headers: { "content-type": "text/plain", etag: '"html-source"' }
        });
      }
    }
  };
  const request = new Request("https://example.test/");
  const response = await serveHtmlPage(request, env, new URL(request.url), "/__pages/index.txt");
  assert.equal(response.status, 200);
  assert.match(await response.text(), /styles\.css\?v=version-html-123/);
  assert.equal(response.headers.get("content-type"), "text/html; charset=UTF-8");
  assert.equal(response.headers.has("etag"), false);
});

test("Wrangler config exposes Cloudflare version metadata to the Worker", () => {
  const config = JSON.parse(fs.readFileSync(path.resolve("wrangler.jsonc"), "utf8"));
  assert.deepEqual(config.version_metadata, { binding: "CF_VERSION_METADATA" });
});
