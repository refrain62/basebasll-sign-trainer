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
const lockPath = path.join(root, "package-lock.json");
const workflowPath = path.join(root, ".github/workflows/ci.yml");
const dependabotPath = path.join(root, ".github/dependabot.yml");
const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8")) as PackageJson;

const exactSemver = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/;
for (const [groupName, group] of Object.entries({ dependencies: pkg.dependencies || {}, devDependencies: pkg.devDependencies || {} })) {
  for (const [name, version] of Object.entries(group)) {
    if (!exactSemver.test(version)) failures.push(`${groupName}.${name} must use an exact version, found ${version}`);
  }
}

if (pkg.engines?.node !== ">=22.12 <23") {
  failures.push(`engines.node must stay on Node 22 (>=22.12 <23), found ${pkg.engines?.node || "missing"}`);
}

const nodeTypes = pkg.devDependencies?.["@types/node"] || "";
if (!/^22\./.test(nodeTypes)) failures.push(`@types/node must match the Node 22 runtime, found ${nodeTypes || "missing"}`);

const vitest = pkg.devDependencies?.vitest || "";
const coverage = pkg.devDependencies?.["@vitest/coverage-v8"] || "";
if (!vitest || !coverage || vitest !== coverage) {
  failures.push(`vitest and @vitest/coverage-v8 must use the same exact version (vitest=${vitest || "missing"}, coverage=${coverage || "missing"})`);
}

if (!fs.existsSync(lockPath)) {
  if (process.env.CI === "true") failures.push("package-lock.json is required in CI");
  else warnings.push("package-lock.json is not bundled in release ZIPs; run npm install to regenerate it before committing dependency changes");
} else {
  const lock = JSON.parse(fs.readFileSync(lockPath, "utf8")) as {
    packages?: Record<string, { dependencies?: Record<string, string>; devDependencies?: Record<string, string> }>;
  };
  const rootPackage = lock.packages?.[""];
  if (!rootPackage) {
    failures.push("package-lock.json does not contain the root package entry");
  } else {
    for (const [name, version] of Object.entries(pkg.dependencies || {})) {
      if (rootPackage.dependencies?.[name] !== version) failures.push(`package-lock root dependency mismatch: ${name}`);
    }
    for (const [name, version] of Object.entries(pkg.devDependencies || {})) {
      if (rootPackage.devDependencies?.[name] !== version) failures.push(`package-lock root devDependency mismatch: ${name}`);
    }
  }
}

if (!fs.existsSync(workflowPath)) {
  failures.push(".github/workflows/ci.yml is missing");
} else {
  const workflow = fs.readFileSync(workflowPath, "utf8");
  if (!/^\s*node-version:\s*["']?22["']?\s*$/m.test(workflow)) failures.push("CI must run Node 22");
  if (!workflow.includes("npm ci --ignore-scripts")) failures.push("CI must install from package-lock.json with npm ci --ignore-scripts");
  if (!workflow.includes("npm run dependency:policy")) failures.push("CI must run dependency:policy");
}

if (!fs.existsSync(dependabotPath)) {
  failures.push(".github/dependabot.yml is missing");
} else {
  const dependabot = fs.readFileSync(dependabotPath, "utf8");
  if (!dependabot.includes('dependency-name: "@types/node"') || !dependabot.includes('version-update:semver-major')) {
    failures.push("Dependabot must ignore @types/node major updates so Node types cannot drift away from Node 22");
  }
  if (!/groups:\s*[\s\S]*vitest-stack:\s*[\s\S]*patterns:\s*[\s\S]*"vitest"[\s\S]*"@vitest\/\*"/m.test(dependabot)) {
    failures.push("Dependabot must group vitest and @vitest/* updates");
  }
}

if (warnings.length) console.warn("Dependency policy warnings:\n- " + warnings.join("\n- "));

if (failures.length) {
  console.error("Dependency policy check failed:\n- " + failures.join("\n- "));
  process.exit(1);
}

console.log(`Dependency policy check passed (Node 22, @types/node ${nodeTypes}, Vitest ${vitest}).`);
