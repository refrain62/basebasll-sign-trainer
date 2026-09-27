export interface DevCommandOptions {
  platform?: NodeJS.Platform;
  env?: NodeJS.ProcessEnv;
}

export interface DevCommand {
  command: string;
  args: string[];
}

function createNpxCommand(toolArgs: string[], { platform = process.platform, env = process.env }: DevCommandOptions = {}): DevCommand {
  if (platform === "win32") {
    return {
      command: env.ComSpec || "cmd.exe",
      args: ["/d", "/s", "/c", `npx --no-install ${toolArgs.join(" ")}`]
    };
  }
  return { command: "npx", args: ["--no-install", ...toolArgs] };
}

export function createDevCommand(options: DevCommandOptions = {}): DevCommand {
  return createNpxCommand(["wrangler", "dev", "--env", "dev"], options);
}

export function createViteWatchCommand(options: DevCommandOptions = {}): DevCommand {
  return createNpxCommand(["vite", "build", "--watch"], options);
}
