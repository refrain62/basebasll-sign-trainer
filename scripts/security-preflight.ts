import fs from "node:fs";
import path from "node:path";
import { findInvalidGitHubActionUses } from "./github-action-pin-policy.ts";

interface PackageJson {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  engines?: { node?: string; npm?: string };
  packageManager?: string;
}

interface WranglerEnvironment {
  secrets?: { required?: string[] };
  version_metadata?: { binding?: string };
  vars?: Record<string, unknown>;
}

interface WranglerConfig {
  secrets?: { required?: string[] };
  version_metadata?: { binding?: string };
  vars?: Record<string, unknown>;
  env?: Record<string, WranglerEnvironment>;
}

const root = process.cwd();
const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8")) as PackageJson;
const failures: string[] = [];

if (pkg.devDependencies?.wrangler !== "4.141.0") failures.push("wrangler must be pinned exactly to 4.141.0");
if (!/^4\.13\.\d+$/.test(pkg.dependencies?.hono || "")) failures.push("hono must stay on the exact 4.13.x patch line");
if (pkg.dependencies?.zod !== "4.6.5") failures.push("zod must be pinned exactly to 4.6.5");
if (pkg.dependencies?.qrcode !== "1.5.4") failures.push("qrcode must be pinned exactly to 1.5.4");
if (pkg.devDependencies?.["@types/qrcode"] !== "1.5.6") failures.push("@types/qrcode must be pinned exactly to 1.5.6");
if (pkg.dependencies?.["@synapxlab/qrcode"]) failures.push("legacy @synapxlab/qrcode dependency must be removed");
if (pkg.devDependencies?.typescript !== "7.0.2") failures.push("typescript must be pinned exactly to 7.0.2");
if (!/^24\./.test(pkg.devDependencies?.["@types/node"] || "")) failures.push("@types/node must stay on the Node 24 major");
if (pkg.devDependencies?.vite !== "8.3.1") failures.push("vite must be pinned exactly to 8.3.1");
const vitestVersion = pkg.devDependencies?.vitest || "";
const coverageVersion = pkg.devDependencies?.["@vitest/coverage-v8"] || "";
if (!/^5\.0\.\d+$/.test(vitestVersion)) failures.push("vitest must stay on the exact 5.0.x patch line");
if (!/^5\.0\.\d+$/.test(coverageVersion)) failures.push("@vitest/coverage-v8 must stay on the exact 5.0.x patch line");
if (vitestVersion && coverageVersion && vitestVersion !== coverageVersion) failures.push("vitest and @vitest/coverage-v8 must use the same version");

if (pkg.engines?.node !== ">=24 <25") failures.push("Node engine must be pinned to the Node 24 major: >=24 <25");
if (pkg.engines?.npm !== ">=11 <12") failures.push("npm engine must be pinned to npm 11: >=11 <12");
if (pkg.packageManager !== "npm@11.6.2") failures.push("packageManager must remain npm@11.6.2");
const nvmrcPath = path.join(root, ".nvmrc");
const nodeVersionPath = path.join(root, ".node-version");
if (!fs.existsSync(nvmrcPath) || fs.readFileSync(nvmrcPath, "utf8").trim() !== "24") failures.push(".nvmrc must select Node 24");
if (!fs.existsSync(nodeVersionPath) || fs.readFileSync(nodeVersionPath, "utf8").trim() !== "24") failures.push(".node-version must select Node 24");
const ciWorkflowPath = path.join(root, ".github/workflows/ci.yml");
const ciWorkflow = fs.existsSync(ciWorkflowPath) ? fs.readFileSync(ciWorkflowPath, "utf8") : "";
if (!/node-version:\s*24(?:\s|$)/m.test(ciWorkflow)) failures.push("CI must run on Node 24");
if (!/runs-on:\s*ubuntu-24\.04(?:\s|$)/m.test(ciWorkflow)) failures.push("CI runner must be pinned to ubuntu-24.04 instead of ubuntu-latest");
if (!/uses:\s*actions\/checkout@[0-9a-f]{40}\s+# v\d+\.\d+\.\d+\s*$/m.test(ciWorkflow)) failures.push("CI must pin actions/checkout to a full SHA with an inline release-version comment so the action runtime is Node 24");
if (!/uses:\s*actions\/setup-node@[0-9a-f]{40}\s+# v\d+\.\d+\.\d+\s*$/m.test(ciWorkflow)) failures.push("CI must pin actions/setup-node to a full SHA with an inline release-version comment so the action runtime is Node 24");
const workflowsDir = path.join(root, ".github/workflows");
function listWorkflowFiles(directory: string): string[] {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return listWorkflowFiles(entryPath);
    return /\.ya?ml$/i.test(entry.name) ? [entryPath] : [];
  });
}

for (const workflowPath of listWorkflowFiles(workflowsDir)) {
  const workflow = fs.readFileSync(workflowPath, "utf8");
  const relativePath = path.relative(root, workflowPath).replace(/\\/g, "/");
  for (const invalidUse of findInvalidGitHubActionUses(workflow)) {
    failures.push(`${relativePath}:${invalidUse.lineNumber} remote uses must pin a full 40-character lowercase SHA and include a same-line # vMAJOR.MINOR.PATCH comment: ${invalidUse.reference}`);
  }
}

if (fs.existsSync(workflowsDir)) {
  for (const name of fs.readdirSync(workflowsDir).filter((file) => /\.ya?ml$/i.test(file))) {
    const workflow = fs.readFileSync(path.join(workflowsDir, name), "utf8");
    if (/CLOUDFLARE_API_TOKEN|CLOUDFLARE_ACCOUNT_ID/.test(workflow)) {
      failures.push(`GitHub Actions must not store Cloudflare API credentials; manual deploys may only trigger Deploy Hooks: .github/workflows/${name}`);
    }
    if (/wrangler\s+deploy|npm\s+run\s+deploy:(?:dev|staging|prod)|npm\s+run\s+db:migrate:(?:dev|staging|prod)/.test(workflow)) {
      failures.push(`GitHub Actions must not run Wrangler deploy or remote D1 migrations; use Workers Builds / local OAuth instead: .github/workflows/${name}`);
    }
  }
}
if (fs.existsSync(path.join(workflowsDir, "deploy-staging.yml"))) {
  failures.push("legacy .github/workflows/deploy-staging.yml must be removed; Workers Builds owns deployment");
}
const manualDeployWorkflowPath = path.join(workflowsDir, "manual-deploy.yml");
if (!fs.existsSync(manualDeployWorkflowPath)) {
  failures.push(".github/workflows/manual-deploy.yml is missing; manual deploys must trigger Cloudflare Deploy Hooks");
} else {
  const manualDeploy = fs.readFileSync(manualDeployWorkflowPath, "utf8");
  if (!/workflow_dispatch:/m.test(manualDeploy)) failures.push("manual-deploy.yml must use workflow_dispatch");
  if (!/secrets\.CLOUDFLARE_DEPLOY_HOOK/.test(manualDeploy)) failures.push("manual-deploy.yml must read the environment-scoped CLOUDFLARE_DEPLOY_HOOK secret");
  for (const environmentName of ["dev", "staging", "production"]) {
    if (!new RegExp(`name:\\s*${environmentName}(?:\\s|$)`, "m").test(manualDeploy)) failures.push(`manual-deploy.yml must reference the ${environmentName} GitHub Environment`);
  }
  if (!/runs-on:\s*ubuntu-24\.04(?:\s|$)/m.test(manualDeploy)) failures.push("manual-deploy.yml runner must be pinned to ubuntu-24.04");
  if (/CLOUDFLARE_API_TOKEN|CLOUDFLARE_ACCOUNT_ID|wrangler\s+deploy|db:migrate:/.test(manualDeploy)) {
    failures.push("manual-deploy.yml must only POST to Deploy Hooks; direct Cloudflare API credentials, Wrangler deploy, and D1 migration are forbidden");
  }
}
const dependabotPath = path.join(root, ".github/dependabot.yml");
const dependabot = fs.existsSync(dependabotPath) ? fs.readFileSync(dependabotPath, "utf8") : "";
if (!dependabot.includes('dependency-name: "@types/node"') || !dependabot.includes('version-update:semver-major')) {
  failures.push("Dependabot must ignore @types/node major updates while the runtime is Node 24");
}
if (!dependabot.includes("package-ecosystem: github-actions")) {
  failures.push("Dependabot must monitor GitHub Actions versions");
}

const packageLockPath = path.join(root, "package-lock.json");
if (!fs.existsSync(packageLockPath)) {
  failures.push("package-lock.json is missing. Run `npm install --package-lock-only --ignore-scripts` with Node 24 / npm 11 and commit it before deploy.");
} else {
  const lock = JSON.parse(fs.readFileSync(packageLockPath, "utf8")) as { packages?: Record<string, { dependencies?: Record<string, string>; devDependencies?: Record<string, string>; engines?: { node?: string; npm?: string } }> };
  const rootPackage = lock.packages?.[""];
  if (!rootPackage) failures.push("package-lock.json root package metadata is missing");
  else {
    const sameMap = (left: Record<string, string> = {}, right: Record<string, string> = {}) => JSON.stringify(Object.entries(left).sort()) === JSON.stringify(Object.entries(right).sort());
    if (!sameMap(rootPackage.dependencies, pkg.dependencies)) failures.push("package-lock.json runtime dependencies are out of sync with package.json");
    if (!sameMap(rootPackage.devDependencies, pkg.devDependencies)) failures.push("package-lock.json devDependencies are out of sync with package.json");
    if (rootPackage.engines?.node !== pkg.engines?.node || rootPackage.engines?.npm !== pkg.engines?.npm) {
      failures.push("package-lock.json engines are out of sync with the Node 24 / npm 11 package.json baseline; regenerate the lockfile with Node 24");
    }
  }
}

const wrangler = JSON.parse(fs.readFileSync(path.join(root, "wrangler.jsonc"), "utf8")) as WranglerConfig;
const requiredSecuritySecrets = ["SESSION_SECRET", "SYSTEM_ADMIN_SECRET", "PASSWORD_PEPPER", "DATA_ENCRYPTION_KEY", "DATA_LOOKUP_KEY", "GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "LINE_CHANNEL_ID", "LINE_CHANNEL_SECRET"];

const devVarsExamplePath = path.join(root, ".dev.vars.example");
if (!fs.existsSync(devVarsExamplePath)) {
  failures.push(".dev.vars.example is missing");
} else {
  const devVarsExample = fs.readFileSync(devVarsExamplePath, "utf8");
  for (const name of requiredSecuritySecrets) {
    if (!new RegExp(`^${name}=`, "m").test(devVarsExample)) failures.push(`.dev.vars.example required entry missing: ${name}`);
  }
}

for (const name of requiredSecuritySecrets) {
  if (!(wrangler.secrets?.required || []).includes(name)) failures.push(`wrangler production required secret missing: ${name}`);
  for (const envName of ["dev", "staging"]) {
    if (!(wrangler.env?.[envName]?.secrets?.required || []).includes(name)) failures.push(`wrangler ${envName} required secret missing: ${name}`);
  }
}

if (String(wrangler.vars?.REQUIRE_CF_ACCESS_FOR_ENVIRONMENT || "false") !== "false") {
  failures.push("wrangler production REQUIRE_CF_ACCESS_FOR_ENVIRONMENT must remain false so the public site stays public");
}
if (String(wrangler.vars?.REQUIRE_CF_ACCESS_FOR_SYSTEM_ADMIN || "false") !== "false") {
  failures.push("wrangler production REQUIRE_CF_ACCESS_FOR_SYSTEM_ADMIN must remain false; SYSTEM admin uses SYSTEM_ADMIN_SECRET + application session");
}
for (const envName of ["dev", "staging"]) {
  const vars = wrangler.env?.[envName]?.vars || {};
  if (String(vars.REQUIRE_CF_ACCESS_FOR_ENVIRONMENT || "false") !== "true") {
    failures.push(`wrangler ${envName} REQUIRE_CF_ACCESS_FOR_ENVIRONMENT must be true`);
  }
  if (String(vars.REQUIRE_CF_ACCESS_FOR_SYSTEM_ADMIN || "false") !== "false") {
    failures.push(`wrangler ${envName} REQUIRE_CF_ACCESS_FOR_SYSTEM_ADMIN must be false; environment-wide Access already protects this environment`);
  }
  if (!("ENVIRONMENT_ACCESS_ALLOWED_EMAILS" in vars)) {
    failures.push(`wrangler ${envName} ENVIRONMENT_ACCESS_ALLOWED_EMAILS entry is missing`);
  }
  if (!("CF_ACCESS_TEAM_DOMAIN" in vars) || !("CF_ACCESS_POLICY_AUD" in vars)) {
    failures.push(`wrangler ${envName} Cloudflare Access configuration entries are missing`);
  }
}

const versionMetadataBinding = "CF_VERSION_METADATA";
if (wrangler.version_metadata?.binding !== versionMetadataBinding) {
  failures.push(`wrangler production version_metadata.binding must be ${versionMetadataBinding}`);
}
for (const envName of ["dev", "staging"]) {
  if (wrangler.env?.[envName]?.version_metadata?.binding !== versionMetadataBinding) {
    failures.push(`wrangler ${envName} version_metadata.binding must be ${versionMetadataBinding}`);
  }
}

for (const secretFile of [".dev.vars", ".dev.vars.dev", ".env", ".env.local"]) {
  if (fs.existsSync(path.join(root, secretFile)) && process.env.ALLOW_LOCAL_SECRET_FILES !== "1") {
    console.warn(`[security] local secret file exists: ${secretFile} (allowed for local dev; never include it in distributed ZIP/Git)`);
  }
}

const allowedRuntime = new Set(["hono", "zod", "qrcode"]);
const allowedDev = new Set(["wrangler", "typescript", "@types/node", "@types/qrcode", "vite", "vitest", "@vitest/coverage-v8"]);
for (const name of Object.keys(pkg.dependencies || {})) if (!allowedRuntime.has(name)) failures.push(`unexpected runtime dependency: ${name}`);
for (const name of Object.keys(pkg.devDependencies || {})) if (!allowedDev.has(name)) failures.push(`unexpected dev dependency: ${name}`);

if (failures.length) {
  console.error("Security preflight failed:\n- " + failures.join("\n- "));
  process.exit(1);
}
console.log("Security preflight passed.");
