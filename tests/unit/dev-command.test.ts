import { test } from "vitest";
import assert from "node:assert/strict";
import { createDevCommand } from "../../scripts/dev-command.ts";

test("Windows uses cmd.exe instead of spawning npx.cmd directly", () => {
  const command = createDevCommand({
    platform: "win32",
    env: { ComSpec: "C:\\Windows\\System32\\cmd.exe" }
  });

  assert.equal(command.command, "C:\\Windows\\System32\\cmd.exe");
  assert.deepEqual(command.args, [
    "/d",
    "/s",
    "/c",
    "npx --no-install wrangler dev --env dev"
  ]);
  assert.ok(!command.command.endsWith(".cmd"));
});

test("Windows falls back to cmd.exe when ComSpec is unavailable", () => {
  const command = createDevCommand({ platform: "win32", env: {} });
  assert.equal(command.command, "cmd.exe");
});

test("macOS/Linux launches npx directly", () => {
  const command = createDevCommand({ platform: "linux", env: {} });
  assert.equal(command.command, "npx");
  assert.deepEqual(command.args, ["--no-install", "wrangler", "dev", "--env", "dev"]);
});

import { createViteWatchCommand } from "../../scripts/dev-command.ts";

test("Vite build watch also uses cmd.exe safely on Windows", () => {
  const command = createViteWatchCommand({ platform: "win32", env: { ComSpec: "C:\\Windows\\System32\\cmd.exe" } });
  assert.equal(command.command, "C:\\Windows\\System32\\cmd.exe");
  assert.deepEqual(command.args, ["/d", "/s", "/c", "npx --no-install vite build --watch"]);
});

test("Vite build watch launches npx directly on Linux", () => {
  const command = createViteWatchCommand({ platform: "linux", env: {} });
  assert.equal(command.command, "npx");
  assert.deepEqual(command.args, ["--no-install", "vite", "build", "--watch"]);
});
