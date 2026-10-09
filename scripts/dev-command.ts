export interface DevCommandOptions {
  platform?: NodeJS.Platform;
  env?: NodeJS.ProcessEnv;
}

export interface DevCommand {
  command: string;
  args: string[];
}

function createPnpmCommand(toolArgs: string[], { platform = process.platform, env = process.env }: DevCommandOptions = {}): DevCommand {
  if (platform === "win32") {
    return {
      command: env.ComSpec || "cmd.exe",
      args: ["/d", "/s", "/c", `pnpm exec ${toolArgs.join(" ")}`]
    };
  }
  return { command: "pnpm", args: ["exec", ...toolArgs] };
}

export function createDevCommand(options: DevCommandOptions = {}): DevCommand {
  return createPnpmCommand(["wrangler", "dev", "--env", "dev"], options);
}
