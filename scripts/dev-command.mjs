/**
 * Build the local Wrangler launch command without relying on spawning a .cmd file
 * directly from Node. Node 24 on Windows can reject spawn("npx.cmd", ...) with
 * EINVAL, while cmd.exe can resolve npx.cmd normally.
 */
export function createDevCommand({ platform = process.platform, env = process.env } = {}) {
  if (platform === "win32") {
    return {
      command: env.ComSpec || "cmd.exe",
      args: ["/d", "/s", "/c", "npx --no-install wrangler dev --env dev"]
    };
  }

  return {
    command: "npx",
    args: ["--no-install", "wrangler", "dev", "--env", "dev"]
  };
}
