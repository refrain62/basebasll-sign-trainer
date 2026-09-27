import { test } from "vitest";
import assert from "node:assert/strict";
import { createAdminTransitionRepository } from "../../src/repositories/admin-transition-repository.ts";

function fakeD1() {
  const batches = [];
  return {
    batches,
    prepare(sql) {
      return {
        bind(...args) { return { sql, args }; }
      };
    },
    async batch(statements) {
      batches.push(statements);
      return statements.map((_statement, index) => ({ meta: { changes: index === 1 ? 1 : 0 } }));
    }
  };
}


test("legacy-team claim adds the first owner and disables shared admin password in one batch", async () => {
  const batches = [];
  const db = {
    prepare(sql) { return { bind(...args) { return { sql, args }; } }; },
    async batch(statements) { batches.push(statements); return [{ meta: { changes: 1 } }, { meta: { changes: 1 } }]; }
  };
  const repository = createAdminTransitionRepository(db);
  assert.equal(await repository.claimLegacyTeam({ teamId: "Team1234", userId: "u_owner12345678" }), true);
  const [createOwner, disableLegacy] = batches[0];
  assert.match(createOwner.sql, /NOT EXISTS \(SELECT 1 FROM team_admin_memberships WHERE team_id=\?\)/);
  assert.match(disableLegacy.sql, /admin_password_enabled=0/);
  assert.match(disableLegacy.sql, /admin_session_version=admin_session_version\+1/);
});

test("direct owner transfer guards the old owner mutation with the target still being an admin", async () => {
  const db = fakeD1();
  const repository = createAdminTransitionRepository(db);

  const ok = await repository.transferToExisting({
    teamId: "Team1234",
    currentOwnerUserId: "u_owner12345678",
    nextOwnerUserId: "u_admin12345678",
    currentOwnerExit: false
  });

  assert.equal(ok, true);
  assert.equal(db.batches.length, 1);
  const [demoteOwner, promoteTarget, disableLegacy, revokeInvites] = db.batches[0];
  assert.match(demoteOwner.sql, /EXISTS \(SELECT 1 FROM team_admin_memberships WHERE team_id=\? AND user_id=\? AND role='admin'\)/);
  assert.deepEqual(demoteOwner.args, ["Team1234", "u_owner12345678", "Team1234", "u_admin12345678"]);
  assert.match(promoteTarget.sql, /role='owner'/);
  assert.match(disableLegacy.sql, /EXISTS \(SELECT 1 FROM team_admin_memberships/);
  assert.match(revokeInvites.sql, /EXISTS \(SELECT 1 FROM team_admin_memberships/);
});

test("direct owner transfer uses the same race guard when the previous owner exits", async () => {
  const db = fakeD1();
  const repository = createAdminTransitionRepository(db);

  await repository.transferToExisting({
    teamId: "Team1234",
    currentOwnerUserId: "u_owner12345678",
    nextOwnerUserId: "u_admin12345678",
    currentOwnerExit: true
  });

  const [removeOwner] = db.batches[0];
  assert.match(removeOwner.sql, /^DELETE FROM team_admin_memberships/m);
  assert.match(removeOwner.sql, /role='admin'/);
});


test("admin invite acceptance includes a database-side five-sub-admin guard", async () => {
  const db = fakeD1();
  const repository = createAdminTransitionRepository(db);
  await repository.acceptAdminInvite({ inviteId: "inv_1", teamId: "Team1234", userId: "u_newadmin", maxSubAdmins: 5 });
  const [insertAdmin, acceptInvite] = db.batches[0];
  assert.match(insertAdmin.sql, /COUNT\(\*\).*role='admin'/s);
  assert.equal(insertAdmin.args.at(-1), 5);
  assert.match(acceptInvite.sql, /EXISTS \(SELECT 1 FROM team_admin_memberships/);
});
