import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, type Plugin } from "vite";
import { PAGE_ENTRIES, renderVitePages } from "./scripts/render-vite-pages.ts";

const rootDir = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(rootDir, "public");
const packageJson = JSON.parse(fs.readFileSync(path.join(rootDir, "package.json"), "utf8")) as { version: string };

const entryPoints = {
  landing: path.join(rootDir, "client/landing.ts"),
  team: path.join(rootDir, "client/team.ts"),
  "admin-entry": path.join(rootDir, "client/admin-entry.ts"),
  account: path.join(rootDir, "client/account.ts"),
  legal: path.join(rootDir, "client/legal.ts")
} as const;

function renderWorkerPages(): Plugin {
  return {
    name: "sign-trainer-render-worker-pages",
    apply: "build",
    buildStart() {
      for (const pageName of Object.keys(PAGE_ENTRIES)) this.addWatchFile(path.join(rootDir, "pages", `${pageName}.html`));
    },
    writeBundle(_options, bundle) {
      const entries = new Map<string, string>();
      for (const output of Object.values(bundle)) {
        if (output.type !== "chunk") continue;
        if (output.isEntry) entries.set(output.name, `/build/${output.fileName}`);
      }

      renderVitePages(Object.fromEntries(entries), rootDir);
    }
  };
}

export default defineConfig({
  base: "/build/",
  publicDir: false,
  define: {
    __APP_VERSION__: JSON.stringify(packageJson.version)
  },
  input: entryPoints,
  build: {
    target: "es2022",
    outDir: path.join(publicDir, "build"),
    emptyOutDir: true,
    sourcemap: false,
    manifest: "manifest.json",
    rolldownOptions: {
      output: {
        entryFileNames: "assets/[name]-[hash].js",
        chunkFileNames: "assets/[name]-[hash].js",
        assetFileNames: "assets/[name]-[hash][extname]"
      }
    }
  },
  plugins: [renderWorkerPages()]
});
