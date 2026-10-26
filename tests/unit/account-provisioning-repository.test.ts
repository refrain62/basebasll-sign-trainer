import { test } from "vitest";
import assert from "node:assert/strict";
import { createAccountProvisioningRepository } from "../../src/repositories/account-provisioning-repository.ts";

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
  assert.match(statements[1].sql, /EXISTS \(SELECT 1 FROM teams/);
});
