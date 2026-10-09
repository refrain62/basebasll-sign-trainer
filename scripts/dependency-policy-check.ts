import fs from "node:fs";
import path from "node:path";

type PackageJson = {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  engines?: Record<string, string>;
};

const root = process.cwd();
const failures: string[] = [];
const warnings: string[] = [];
const pkgPath = path.join(root, "package.json");
const lockPath = path.join(root, "pnpm-lock.yaml");
const workspaceConfigPath = path.join(root, "pnpm-workspace.yaml");
const workflowPath = path.join(root, ".github/workflows/ci.yml");
const dependabotPath = path.join(root, ".github/dependabot.yml");
const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8")) as PackageJson;

const exactSemver = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/;
for (const [groupName, group] of Object.entries({ dependencies: pkg.dependencies || {}, devDependencies: pkg.devDependencies || {} })) {
  for (const [name, version] of Object.entries(group)) {
    if (!exactSemver.test(version)) failures.push(`${groupName}.${name} must use an exact version, found ${version}`);
  }
}

if (pkg.engines?.node !== ">=24 <25") {
  failures.push(`engines.node must stay on Node 24 (>=24 <25), found ${pkg.engines?.node || "missing"}`);
}

if (!fs.existsSync(workspaceConfigPath)) {
  failures.push("pnpm-workspace.yaml is required for pnpm overrides and project settings");
} else {
  const workspaceConfig = fs.readFileSync(workspaceConfigPath, "utf8");
  if (!/^overrides:\s*$/m.test(workspaceConfig) || !/^\s+sharp:\s*["']?0\.35\.5["']?\s*$/m.test(workspaceConfig)) {
    failures.push("pnpm-workspace.yaml must pin overrides.sharp to 0.35.5");
  }
  for (const setting of ["saveExact", "lockfile", "ignoreScripts", "engineStrict"]) {
    if (!new RegExp(`^${setting}:\\s*true\\s*$`, "m").test(workspaceConfig)) {
      failures.push(`pnpm-workspace.yaml must set ${setting}: true`);
    }
  }
}

const nodeTypes = pkg.devDependencies?.["@types/node"] || "";
if (!/^24\./.test(nodeTypes)) failures.push(`@types/node must match the Node 24 runtime, found ${nodeTypes || "missing"}`);

const vitest = pkg.devDependencies?.vitest || "";
const coverage = pkg.devDependencies?.["@vitest/coverage-v8"] || "";
if (!vitest || !coverage || vitest !== coverage) {
  failures.push(`vitest and @vitest/coverage-v8 must use the same exact version (vitest=${vitest || "missing"}, coverage=${coverage || "missing"})`);
}

if (!fs.existsSync(lockPath)) {
  if (process.env.CI === "true") failures.push("pnpm-lock.yaml is required in CI");
  else warnings.push("pnpm-lock.yaml is missing; run pnpm install --lockfile-only --ignore-scripts to regenerate it before committing dependency changes");
} else {
  const lock = fs.readFileSync(lockPath, "utf8");
  if (!/^lockfileVersion:\s*['\"]?9\./m.test(lock)) failures.push("pnpm-lock.yaml must use lockfile format 9");
  const hasSpecifier = (name: string, version: string) => {
    const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const escapedVersion = version.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`^\\s+['"]?${escapedName}['"]?:\\s*\\n\\s+specifier:\\s*${escapedVersion}\\s*$`, "m").test(lock);
  };
  for (const [name, version] of Object.entries(pkg.dependencies || {})) {
    if (!hasSpecifier(name, version)) failures.push(`pnpm-lock.yaml dependency mismatch: ${name}`);
  }
  for (const [name, version] of Object.entries(pkg.devDependencies || {})) {
    if (!hasSpecifier(name, version)) failures.push(`pnpm-lock.yaml devDependency mismatch: ${name}`);
  }
  if (!/(?:^|\n)\s+sharp:\s*0\.35\.5\s*(?:\n|$)/m.test(lock)) {
    failures.push("pnpm-lock.yaml must record pnpm.overrides.sharp as 0.35.5");
  }
}

if (!fs.existsSync(workflowPath)) {
  failures.push(".github/workflows/ci.yml is missing");
} else {
  const workflow = fs.readFileSync(workflowPath, "utf8");
  if (!/^\s*node-version:\s*["']?24["']?\s*$/m.test(workflow)) failures.push("CI must run Node 24");
  if (!workflow.includes("pnpm install --frozen-lockfile --ignore-scripts")) failures.push("CI must install from pnpm-lock.yaml with pnpm install --frozen-lockfile --ignore-scripts");
  if (!workflow.includes("pnpm run dependency:policy")) failures.push("CI must run dependency:policy");
}

if (!fs.existsSync(dependabotPath)) {
  failures.push(".github/dependabot.yml is missing");
} else {
  const dependabot = fs.readFileSync(dependabotPath, "utf8");
  if (!dependabot.includes('dependency-name: "@types/node"') || !dependabot.includes('version-update:semver-major')) {
    failures.push("Dependabot must ignore @types/node major updates so Node types cannot drift away from Node 24");
  }
  if (!/groups:\s*[\s\S]*vitest-tooling:\s*[\s\S]*patterns:\s*[\s\S]*"vitest"[\s\S]*"@vitest\/\*"/m.test(dependabot)) {
    failures.push("Dependabot must group vitest and @vitest/* updates");
  }
}

if (warnings.length) console.warn("Dependency policy warnings:\n- " + warnings.join("\n- "));

if (failures.length) {
  console.error("Dependency policy check failed:\n- " + failures.join("\n- "));
  process.exit(1);
}

console.log(`Dependency policy check passed (Node 24, @types/node ${nodeTypes}, Vitest ${vitest}).`);
