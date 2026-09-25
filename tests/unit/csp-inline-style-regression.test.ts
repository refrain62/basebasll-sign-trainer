import { test } from "vitest";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

function filesUnder(root, extension) {
  return fs.readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(root, entry.name);
    if (entry.isDirectory()) return filesUnder(full, extension);
    return entry.isFile() && full.endsWith(extension) ? [full] : [];
  });
}

test("first-party UI does not create CSP-blocked inline styles", () => {
  const files = [...filesUnder("client", ".ts"), ...filesUnder("pages", ".html")];
  const violations = [];
  for (const file of files) {
    const source = fs.readFileSync(file, "utf8");
    if (/\.style(?:\.|\[|\s*=)|setAttribute\(\s*["']style["']|\sstyle\s*=\s*["']/.test(source)) {
      violations.push(file);
    }
  }
  assert.deepEqual(violations, []);
});
