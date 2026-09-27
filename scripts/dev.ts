import { spawn, type ChildProcess } from "node:child_process";
import { createDevCommand, createViteWatchCommand } from "./dev-command.ts";

const workerCommand = createDevCommand();
const viteCommand = createViteWatchCommand();
const children: ChildProcess[] = [];
let shuttingDown = false;

function launch(label: string, command: string, args: string[], env: NodeJS.ProcessEnv): ChildProcess {
  const child = spawn(command, args, { stdio: "inherit", env, windowsHide: false });
  children.push(child);
  child.on("error", (error: Error) => {
    console.error(`${label}を起動できませんでした。先に npm install を実行してください。`, error.message);
    shutdown(1);
  });
  child.on("exit", (code, signal) => {
    if (shuttingDown) return;
    if (signal) shutdown(0);
    else shutdown(code ?? 0);
  });
  return child;
}

function shutdown(code = 0): void {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const child of children) {
    if (!child.killed) {
      try { child.kill(); } catch {}
    }
  }
  process.exitCode = code;
}

launch("Vite", viteCommand.command, viteCommand.args, process.env);
launch("Wrangler", workerCommand.command, workerCommand.args, {
  ...process.env,
  CLOUDFLARE_CF_FETCH_ENABLED: process.env.CLOUDFLARE_CF_FETCH_ENABLED || "false"
});

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));
