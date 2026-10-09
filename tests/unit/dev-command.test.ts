import { test } from "vitest";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createDevCommand } from "../../scripts/dev-command.ts";

test("Windows uses cmd.exe instead of spawning pnpm.cmd directly", () => {
  const command = createDevCommand({
    platform: "win32",
    env: { ComSpec: "C:\\Windows\\System32\\cmd.exe" }
  });

  assert.equal(command.command, "C:\\Windows\\System32\\cmd.exe");
  assert.deepEqual(command.args, [
    "/d",
    "/s",
    "/c",
    "pnpm exec wrangler dev --env dev"
  ]);
  assert.ok(!command.command.endsWith(".cmd"));
});

test("Windows falls back to cmd.exe when ComSpec is unavailable", () => {
  const command = createDevCommand({ platform: "win32", env: {} });
  assert.equal(command.command, "cmd.exe");
});

test("macOS/Linux launches pnpm directly", () => {
  const command = createDevCommand({ platform: "linux", env: {} });
  assert.equal(command.command, "pnpm");
  assert.deepEqual(command.args, ["exec", "wrangler", "dev", "--env", "dev"]);
});

test("default dev runner leaves client builds to Wrangler custom builds", () => {
  const dev = readFileSync("scripts/dev.ts", "utf8");
  assert.doesNotMatch(dev, /createViteWatchCommand|vite build --watch/);
});
