import fs from "node:fs";

const expectations: Record<string, string[]> = {
  "src/routes/public.ts": ['.get("/legal"'],
  "src/routes/player.ts": [
    '.get("/session"', '.post("/auth"', '.post("/logout"', '.get("/signs"'
  ],
  "src/routes/account.ts": [
    '.get("/providers"', '.get("/session"', '.post("/logout"', '.post("/teams"', '.delete("/account"',
    '.get("/oauth/:provider/start"', '.get("/oauth/:provider/callback"',
    '.get("/invites/:token"', '.post("/invites/:token/accept"'
  ],
  "src/routes/team-admin.ts": [
    '.get("/session"', '.post("/auth"', '.post("/logout"', '.get("/team"', '.put("/team"',
    '.post("/admins/invites"', '.delete("/admins/invites/:inviteId"', '.delete("/admins/:userId"',
    '.post("/admins/transfer"', '.delete("/membership"', '.post("/legacy-password/disable"',
    '.post("/groups"', '.put("/groups/:groupId"', '.delete("/groups/:groupId"',
    '.post("/signs"', '.put("/signs/:signId"', '.delete("/signs/:signId"',
    '.post("/signs/:signId/videos"', '.put("/videos/:videoId"', '.delete("/videos/:videoId"'
  ],
  "src/routes/system.ts": [
    '.get("/session"', '.post("/auth"', '.post("/logout"', '.get("/teams"', '.post("/teams"',
    '.put("/teams/:teamId"', '.delete("/teams/:teamId"'
  ]
};

const failures: string[] = [];
for (const [file, needles] of Object.entries(expectations)) {
  const source = fs.readFileSync(file, "utf8");
  for (const needle of needles) {
    if (!source.includes(needle)) failures.push(`${file}: missing route ${needle}`);
  }
}

const index = fs.readFileSync("src/index.ts", "utf8");
for (const needle of [
  'from "hono"',
  'app.route("/api/public", publicRoutes)',
  'app.route("/api", playerRoutes)',
  'app.route("/api/account", accountRoutes)',
  'app.route("/api/team-admin", teamAdminRoutes)',
  'app.route("/api/system", systemRoutes)'
]) {
  if (!index.includes(needle)) failures.push(`src/index.ts: missing ${needle}`);
}

const backend = fs.readFileSync("src/backend.ts", "utf8");
if (backend.includes("async function handleApi(")) failures.push("legacy pathname dispatcher still exists in src/backend.ts");

const repositoryFiles = fs.readdirSync("src/repositories").filter((name) => name.endsWith(".ts"));
const repositorySource = repositoryFiles.map((name) => fs.readFileSync(`src/repositories/${name}`, "utf8")).join("\n");
if (!repositorySource.includes(".prepare(")) failures.push("D1 access unexpectedly disappeared from repository layer");

for (const file of ["src/routes/public.ts", "src/routes/player.ts", "src/routes/account.ts", "src/routes/team-admin.ts", "src/routes/system.ts"]) {
  if (fs.readFileSync(file, "utf8").includes("../backend.ts")) failures.push(`${file}: route still depends on backend compatibility facade`);
}

if (failures.length) {
  console.error("Route parity check failed:\n- " + failures.join("\n- "));
  process.exit(1);
}
console.log("Route parity check passed.");
