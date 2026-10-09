import { rm } from "node:fs/promises";
import { resolve } from "node:path";
import { spawn, spawnSync, type ChildProcess } from "node:child_process";

const root = process.cwd();
const stateDir = resolve(root, ".wrangler/e2e-state");
const wranglerBin = resolve(root, "node_modules/wrangler/bin/wrangler.js");

export const E2E_SYSTEM_ADMIN_SECRET = "E2ESystemAdmin12345";
export const E2E_SESSION_SECRET = "e2e-session-secret-0123456789abcdef0123456789abcdef";
export const E2E_PASSWORD_PEPPER = "e2e-password-pepper-0123456789abcdef0123456789abcdef";
export const E2E_DATA_ENCRYPTION_KEY = "e2e-data-encryption-key-0123456789abcdef0123456789abcdef";
export const E2E_DATA_LOOKUP_KEY = "e2e-data-lookup-key-0123456789abcdef0123456789abcdef";

function runWrangler(args: string[]): void {
  const result = spawnSync(process.execPath, [wranglerBin, ...args], {
    cwd: root,
    stdio: "inherit",
    env: { ...process.env, CI: process.env.CI || "1" }
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

await rm(stateDir, { recursive: true, force: true });
runWrangler(["d1", "migrations", "apply", "DB", "--local", "--env", "dev", "--persist-to", stateDir]);

const vars = [
  "ENVIRONMENT:dev",
  "REQUIRE_CF_ACCESS_FOR_ENVIRONMENT:false",
  "REQUIRE_CF_ACCESS_FOR_SYSTEM_ADMIN:false",
  `SESSION_SECRET:${E2E_SESSION_SECRET}`,
  `SYSTEM_ADMIN_SECRET:${E2E_SYSTEM_ADMIN_SECRET}`,
  `PASSWORD_PEPPER:${E2E_PASSWORD_PEPPER}`,
  `DATA_ENCRYPTION_KEY:${E2E_DATA_ENCRYPTION_KEY}`,
  `DATA_LOOKUP_KEY:${E2E_DATA_LOOKUP_KEY}`
];

const args = ["dev", "--local", "--env", "dev", "--port", "8787", "--persist-to", stateDir, "--log-level", "warn"];
for (const value of vars) args.push("--var", value);

const child: ChildProcess = spawn(process.execPath, [wranglerBin, ...args], {
  cwd: root,
  stdio: "inherit",
  env: { ...process.env, CLOUDFLARE_CF_FETCH_ENABLED: "false" },
  windowsHide: false
});

let stopping = false;
function stop(code = 0): void {
  if (stopping) return;
  stopping = true;
  if (!child.killed) {
    try { child.kill(); } catch {}
  }
  process.exitCode = code;
}

child.on("error", (error) => {
  console.error("Playwright E2E用Wranglerを起動できませんでした。", error.message);
  stop(1);
});
child.on("exit", (code, signal) => {
  if (stopping) return;
  if (signal) stop(0);
  else stop(code ?? 0);
});
process.on("SIGINT", () => stop(0));
process.on("SIGTERM", () => stop(0));
