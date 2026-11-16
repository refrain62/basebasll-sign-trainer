import { test } from "vitest";
import assert from "node:assert/strict";
import { createAdminMembershipRepository } from "../../src/repositories/admin-membership-repository.ts";

function fakeD1() {
  const batches = [];
  return {
    batches,
    prepare(sql) {
      return { bind(...args) { return { sql, args }; } };
    },
    async batch(statements) {
      batches.push(statements);
      return [];
    }
  };
}

test("legacy owner transfer mutations require an active, non-deleted team", async () => {
  const db = fakeD1();
  const repository = createAdminMembershipRepository(db);
  await repository.transferOwner({
    teamId: "Team1234",
    currentOwnerUserId: "u_owner12345678",
    nextOwnerUserId: "u_admin12345678"
  });

  const [demoteOwner, promoteTarget] = db.batches[0];
  assert.match(demoteOwner.sql, /status='active' AND deleted_at IS NULL/);
  assert.deepEqual(demoteOwner.args, ["Team1234", "u_owner12345678", "Team1234"]);
  assert.match(promoteTarget.sql, /status='active' AND deleted_at IS NULL/);
  assert.deepEqual(promoteTarget.args, ["Team1234", "u_admin12345678", "Team1234"]);
});
