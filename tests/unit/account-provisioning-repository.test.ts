import { test } from "vitest";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { createAccountProvisioningRepository } from "../../src/repositories/account-provisioning-repository.ts";

function d1FromSqlite(sqlite) {
  return {
    prepare(sql) {
      return {
        bind(...args) {
          return { sql, args };
        }
      };
    },
    async batch(statements) {
      sqlite.exec("BEGIN");
      try {
        const results = statements.map(({ sql, args }) => {
          const result = sqlite.prepare(sql).run(...args);
          return { meta: { changes: Number(result.changes), last_row_id: Number(result.lastInsertRowid) } };
        });
        sqlite.exec("COMMIT");
        return results;
      } catch (error) {
        sqlite.exec("ROLLBACK");
        throw error;
      }
    }
  };
}

test("owned-team provisioning applies the account team limit before inserting the team", async () => {
  let statements = [];
  const db = {
    prepare(sql) {
      return { bind(...args) { return { sql, args }; } };
    },
    async batch(value) {
      statements = value;
      return [{ meta: { changes: 0 } }, { meta: { changes: 0 } }];
    }
  };
  await createAccountProvisioningRepository(db).createOwnedTeam({
    teamId: "Team1234",
    name: "チーム",
    passphraseHash: "passphrase-hash",
    adminHash: "admin-hash",
    userId: "u_owner12345678",
    maxOwnedTeams: 3
  });
  assert.match(statements[0].sql, /INSERT INTO teams[\s\S]*COUNT\(\*\)[\s\S]*role='owner'/);
  assert.equal(statements[0].args.at(-1), 3);
  assert.match(statements[1].sql, /changes\(\)\s*=\s*1 AND EXISTS \(SELECT 1 FROM teams/);
});

test("owned-team provisioning does not claim an existing team when the guarded insert is skipped", async () => {
  const sqlite = new DatabaseSync(":memory:");
  sqlite.exec(`
    CREATE TABLE teams (
      id TEXT PRIMARY KEY, name TEXT, passphrase_hash TEXT, admin_password_hash TEXT,
      admin_password_enabled INTEGER, status TEXT, deleted_at TEXT
    );
    CREATE TABLE team_admin_memberships (
      team_id TEXT NOT NULL, user_id TEXT NOT NULL, role TEXT NOT NULL,
      PRIMARY KEY (team_id, user_id)
    );
    INSERT INTO teams (id, name) VALUES ('existing-team', '別の管理者のチーム');
    INSERT INTO teams (id, name) VALUES ('owned-team', '既存の所有チーム');
    INSERT INTO team_admin_memberships (team_id, user_id, role) VALUES ('owned-team', 'u_owner', 'owner');
  `);
  const db = d1FromSqlite(sqlite);

  try {
    await createAccountProvisioningRepository(db).createOwnedTeam({
      teamId: "existing-team",
      name: "競合チーム",
      passphraseHash: "passphrase-hash",
      adminHash: "admin-hash",
      userId: "u_owner",
      maxOwnedTeams: 1
    });
    const membership = sqlite.prepare("SELECT role FROM team_admin_memberships WHERE team_id='existing-team' AND user_id='u_owner'").get();
    assert.equal(membership, undefined);
  } finally {
    sqlite.close();
  }
});

test("owned-team provisioning ignores soft-deleted teams when applying the active-team limit", async () => {
  const sqlite = new DatabaseSync(":memory:");
  sqlite.exec(`
    CREATE TABLE teams (
      id TEXT PRIMARY KEY, name TEXT, passphrase_hash TEXT, admin_password_hash TEXT,
      admin_password_enabled INTEGER, status TEXT, deleted_at TEXT
    );
    CREATE TABLE team_admin_memberships (
      team_id TEXT NOT NULL, user_id TEXT NOT NULL, role TEXT NOT NULL,
      PRIMARY KEY (team_id, user_id)
    );
    CREATE TABLE team_usage (team_id TEXT PRIMARY KEY);
    CREATE TRIGGER teams_default_usage AFTER INSERT ON teams
    BEGIN
      INSERT INTO team_usage (team_id) VALUES (NEW.id);
    END;
    INSERT INTO teams (id, name, deleted_at) VALUES ('deleted-team', '削除済みチーム', CURRENT_TIMESTAMP);
    INSERT INTO team_admin_memberships (team_id, user_id, role) VALUES ('deleted-team', 'u_owner', 'owner');
  `);
  const db = d1FromSqlite(sqlite);

  try {
    await createAccountProvisioningRepository(db).createOwnedTeam({
      teamId: "new-team",
      name: "新しいチーム",
      passphraseHash: "passphrase-hash",
      adminHash: "admin-hash",
      userId: "u_owner",
      maxOwnedTeams: 1
    });
    assert.equal(sqlite.prepare("SELECT id FROM teams WHERE id='new-team'").get()?.id, "new-team");
    assert.equal(sqlite.prepare("SELECT role FROM team_admin_memberships WHERE team_id='new-team' AND user_id='u_owner'").get()?.role, "owner");
  } finally {
    sqlite.close();
  }
});
