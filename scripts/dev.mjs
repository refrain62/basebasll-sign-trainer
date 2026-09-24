import { spawn } from "node:child_process";
import { createDevCommand } from "./dev-command.mjs";

const { command, args } = createDevCommand();
const child = spawn(command, args, {
  stdio: "inherit",
  env: {
    ...process.env,
    // SIGN TRAINER does not depend on Request.cf in local development.
    // Prevent Miniflare from fetching Cloudflare's cf.json and timing out offline/VPN networks.
    CLOUDFLARE_CF_FETCH_ENABLED: process.env.CLOUDFLARE_CF_FETCH_ENABLED || "false"
  },
  windowsHide: false
});

let shuttingDown = false;

function finish(code = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  process.exitCode = code;
}

child.on("error", (error) => {
  console.error("Wranglerを起動できませんでした。先に npm install を実行してください。", error.message);
  finish(1);
});

child.on("exit", (code, signal) => {
  if (signal) {
    // On Windows, forwarding POSIX signals is unreliable. Exiting the npm script
    // is enough after the child has already terminated.
    finish(0);
    return;
  }
  finish(code ?? 0);
});
