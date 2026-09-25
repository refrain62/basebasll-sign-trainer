import { expect, test } from "vitest";
import assert from "node:assert/strict";
import { createTeamService } from "../../src/services/team-service.ts";

function setup() {
  const updates = [];
  const team = {
    id: "Team1234",
    name: "Team",
    passphrase_hash: "old-passphrase",
    admin_password_hash: "old-admin",
    status: "active"
  };
  const service = createTeamService({
    teamRepository: {
      findById: async () => team,
      updateFromTeamAdmin: async (payload) => { updates.push(payload); },
      publicTeam: (row) => ({ id: row.id, name: row.name })
    },
    auditRepository: { record: async () => {} },
    hashPassword: async (value) => `hash:${value}`
  });
  return { service, updates };
}

test("account admin cannot change the legacy shared administrator password", async () => {
  const { service, updates } = setup();
  await expect(
    service.updateFromTeamAdmin("Team1234", { adminPassword: "Baseball2026" }, { canChangeAdminPassword: false })
  ).rejects.toMatchObject({ code: "owner_required_for_admin_password", status: 403 });
  assert.equal(updates.length, 0);
});

test("owner or legacy administrator capability can change the legacy password", async () => {
  const { service, updates } = setup();
  await service.updateFromTeamAdmin("Team1234", { adminPassword: "Baseball2026" }, { canChangeAdminPassword: true });
  assert.equal(updates.length, 1);
  assert.equal(updates[0].adminPasswordChanged, true);
  assert.equal(updates[0].adminHash, "hash:Baseball2026");
});

test("regular account admin can still update team name and player passphrase", async () => {
  const { service, updates } = setup();
  await service.updateFromTeamAdmin("Team1234", { name: "New Team", passphrase: "new phrase" }, { canChangeAdminPassword: false });
  assert.equal(updates.length, 1);
  assert.equal(updates[0].name, "New Team");
  assert.equal(updates[0].passphraseHash, "hash:new phrase");
});
