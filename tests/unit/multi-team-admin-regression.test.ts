import { afterEach, describe, expect, test } from "vitest";
import { DatabaseSync } from "node:sqlite";
import { readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { createAdminMembershipRepository } from "../../src/repositories/admin-membership-repository.ts";

const openDatabases: DatabaseSync[] = [];

function createMigratedDatabase(): DatabaseSync {
  const db = new DatabaseSync(":memory:");
  openDatabases.push(db);

  const migrationsDir = resolve("migrations");
  const migrationFiles = readdirSync(migrationsDir)
    .filter((name) => name.endsWith(".sql"))
    .sort();

  for (const file of migrationFiles) {
    db.exec(readFileSync(join(migrationsDir, file), "utf8"));
  }

  return db;
}

function createD1Adapter(db: DatabaseSync) {
  return {
    prepare(sql: string) {
      let values: any[] = [];
      const statement = {
        bind(...nextValues: any[]) {
          values = nextValues;
          return statement;
        },
        async first() {
          return db.prepare(sql).get(...values) ?? null;
        },
        async all() {
          return { results: db.prepare(sql).all(...values) };
        },
        async run() {
          const result = db.prepare(sql).run(...values);
          return { success: true, changes: Number(result.changes) };
        }
      };
      return statement;
    }
  };
}

function insertTeam(db: DatabaseSync, id: string, name: string): void {
  db.prepare(`
    INSERT INTO teams(id, name, passphrase_hash, admin_password_hash, status)
    VALUES (?, ?, 'hash:passphrase', 'hash:admin', 'active')
  `).run(id, name);
}

afterEach(() => {
  while (openDatabases.length) openDatabases.pop()?.close();
});

describe("multi-team administrator regression", () => {
  test("the same user can administer multiple teams and list every membership", async () => {
    const db = createMigratedDatabase();
    const memberships = createAdminMembershipRepository(createD1Adapter(db));

    db.prepare(`
      INSERT INTO app_users(id, display_name, status)
      VALUES ('u_multi_admin', 'Multi Team Admin', 'active')
    `).run();

    insertTeam(db, "TeamA00001", "Team A");
    insertTeam(db, "TeamB00001", "Team B");
    insertTeam(db, "TeamC00001", "Team C");

    await memberships.add({ teamId: "TeamA00001", userId: "u_multi_admin", role: "owner" });
    await memberships.add({ teamId: "TeamB00001", userId: "u_multi_admin", role: "admin" });
    await memberships.add({ teamId: "TeamC00001", userId: "u_multi_admin", role: "admin" });

    const result = await memberships.listForUser("u_multi_admin");
    const normalized = result
      .map(({ teamId, teamName, role }) => ({ teamId, teamName, role }))
      .sort((a, b) => a.teamId.localeCompare(b.teamId));

    expect(normalized).toEqual([
      { teamId: "TeamA00001", teamName: "Team A", role: "owner" },
      { teamId: "TeamB00001", teamName: "Team B", role: "admin" },
      { teamId: "TeamC00001", teamName: "Team C", role: "admin" }
    ]);
  });

  test("only duplicate membership within the same team is rejected", async () => {
    const db = createMigratedDatabase();
    const memberships = createAdminMembershipRepository(createD1Adapter(db));

    db.prepare(`
      INSERT INTO app_users(id, display_name, status)
      VALUES ('u_multi_admin', 'Multi Team Admin', 'active')
    `).run();
    insertTeam(db, "TeamA00001", "Team A");
    insertTeam(db, "TeamB00001", "Team B");

    await memberships.add({ teamId: "TeamA00001", userId: "u_multi_admin", role: "owner" });
    await memberships.add({ teamId: "TeamB00001", userId: "u_multi_admin", role: "admin" });

    expect(() => db.prepare(`
      INSERT INTO team_admin_memberships(team_id, user_id, role)
      VALUES ('TeamA00001', 'u_multi_admin', 'admin')
    `).run()).toThrow();

    const count = db.prepare(`
      SELECT COUNT(*) AS count
      FROM team_admin_memberships
      WHERE user_id = 'u_multi_admin'
    `).get() as { count: number };

    expect(Number(count.count)).toBe(2);
  });

  test("the same account can use a different administrator name in each team", async () => {
    const db = createMigratedDatabase();
    const memberships = createAdminMembershipRepository(createD1Adapter(db));

    db.prepare(`
      INSERT INTO app_users(id, display_name, status)
      VALUES ('u_parent', '保護者', 'active')
    `).run();
    insertTeam(db, "TeamA00001", "Team A");
    insertTeam(db, "TeamB00001", "Team B");

    await memberships.add({ teamId: "TeamA00001", userId: "u_parent", role: "owner" });
    await memberships.add({ teamId: "TeamB00001", userId: "u_parent", role: "admin" });
    await memberships.updateDisplayName("TeamA00001", "u_parent", "太郎 父");
    await memberships.updateDisplayName("TeamB00001", "u_parent", "花子 父");

    const result = await memberships.listForUser("u_parent");
    const byTeam = new Map(result.map((team) => [team.teamId, team.adminDisplayName]));
    expect(byTeam.get("TeamA00001")).toBe("太郎 父");
    expect(byTeam.get("TeamB00001")).toBe("花子 父");
  });

  test("My Account exposes a per-team name editor without changing the account-wide name", () => {
    const account = readFileSync("client/account.ts", "utf8");
    const routes = readFileSync("src/routes/account.ts", "utf8");
    const controller = readFileSync("src/controllers/account-controller.ts", "utf8");
    expect(account).toContain("data-edit-team-display-name");
    expect(account).toContain("このチームだけで表示する名前です。ほかのチームや基本の管理者名は変わりません。");
    expect(account).toContain("/api/account/teams/${encodeURIComponent(team.teamId)}/display-name");
    expect(routes).toContain('patch("/teams/:teamId/display-name"');
    expect(controller).toContain("adminMembership.updateOwnDisplayName(teamId, session.userId");
  });

});
