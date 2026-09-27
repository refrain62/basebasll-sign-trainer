import { expect, test } from "vitest";
import assert from "node:assert/strict";
import { createAdminMembershipService } from "../../src/services/admin-membership-service.ts";

function fixture() {
  const members = new Map([
    ["owner", { team_id: "T1", user_id: "owner", role: "owner" }],
    ["admin", { team_id: "T1", user_id: "admin", role: "admin" }]
  ]);
  const calls = [];
  let pending = [];
  let tokenInvite = null;
  const membershipRepository = {
    async find(_teamId, userId) { return members.get(userId) || null; },
    async hasAny() { return members.size > 0; },
    async countByRole(_teamId, role) { return [...members.values()].filter((m) => m.role === role).length; },
    async add({ userId, role }) { members.set(userId, { team_id: "T1", user_id: userId, role }); },
    async listForTeam() { return [...members.values()].map((m) => ({ userId: m.user_id, role: m.role, displayName: m.user_id })); },
    async remove(_teamId, userId) { calls.push(["remove", userId]); members.delete(userId); }
  };
  const inviteRepository = {
    async listPending() { return pending; },
    async create(input) { calls.push(["invite.create", input]); },
    async findByTokenHash() { return tokenInvite; },
    async revoke(inviteId) { calls.push(["invite.revoke", inviteId]); }
  };
  const transitionRepository = {
    async claimLegacyTeam(input) { calls.push(["claimLegacy", input]); members.set(input.userId, { team_id: input.teamId, user_id: input.userId, role: "owner" }); return true; },
    async acceptAdminInvite(input) { calls.push(["acceptAdmin", input]); return true; },
    async acceptTransferInvite(input) { calls.push(["acceptTransfer", input]); return true; },
    async transferToExisting(input) { calls.push(["transferExisting", input]); return true; }
  };
  const teamRepository = {
    async findById() { return { id: "T1", name: "Team", admin_password_enabled: 1 }; },
    async disableAdminPassword() { calls.push(["disableLegacy"]); }
  };
  const auditRepository = { async record(...args) { calls.push(["audit", ...args]); } };
  const service = createAdminMembershipService({
    membershipRepository,
    inviteRepository,
    transitionRepository,
    teamRepository,
    auditRepository,
    createInviteId: () => "inv_12345678",
    createRawToken: () => "raw-secret-token",
    now: () => 1000
  });
  return { service, members, calls, setPending: (value) => { pending = value; }, setInvite: (value) => { tokenInvite = value; } };
}


test("claiming a legacy team atomically creates the owner and disables legacy password", async () => {
  const fx = fixture();
  fx.members.clear();
  const result = await fx.service.claimLegacyTeam("T1", "new-owner");
  assert.equal(result.role, "owner");
  const call = fx.calls.find(([name]) => name === "claimLegacy");
  assert.deepEqual(call[1], { teamId: "T1", userId: "new-owner" });
  assert.ok(fx.calls.some(([name]) => name === "audit"));
});

test("owner invite stores only a token hash in the repository boundary", async () => {
  const fx = fixture();
  const result = await fx.service.createInvite("T1", "owner", { kind: "admin", expiresHours: 24 });
  assert.equal(result.rawToken, "raw-secret-token");
  const stored = fx.calls.find(([name]) => name === "invite.create")[1];
  assert.notEqual(stored.tokenHash, result.rawToken);
  assert.equal(stored.tokenHash.length, 43);
});

test("invite issuance refuses unlimited pending links", async () => {
  const fx = fixture();
  fx.setPending(Array.from({ length: 10 }, (_, i) => ({ id: `inv_${i}` })));
  await expect(fx.service.createInvite("T1", "owner", { kind: "admin" })).rejects.toMatchObject({ code: "too_many_pending_invites" });
});

test("admin invite is rejected after the issuing owner has changed", async () => {
  const fx = fixture();
  fx.setInvite({ id: "inv_old", team_id: "T1", team_name: "Team", kind: "admin", created_by_user_id: "old-owner", creator_name: "Old", status: "pending", expires_at: 2000 });
  await expect(fx.service.acceptInvite("token", "new-admin")).rejects.toMatchObject({ code: "owner_changed" });
  assert.equal(fx.calls.some(([name]) => name === "acceptAdmin"), false);
});

test("user cannot accept an invitation they issued themselves", async () => {
  const fx = fixture();
  fx.setInvite({ id: "inv_self", team_id: "T1", team_name: "Team", kind: "admin", created_by_user_id: "owner", creator_name: "Owner", status: "pending", expires_at: 2000 });
  await expect(fx.service.acceptInvite("token", "owner")).rejects.toMatchObject({ code: "cannot_accept_own_invite" });
});

test("owner transfer to an existing admin delegates atomically and can remove the old owner", async () => {
  const fx = fixture();
  const result = await fx.service.transferToExisting("T1", "owner", "admin", true);
  assert.deepEqual(result, { ok: true });
  const call = fx.calls.find(([name]) => name === "transferExisting")[1];
  assert.equal(call.currentOwnerExit, true);
});

test("an owner must transfer ownership before leaving while an admin may leave", async () => {
  const fx = fixture();
  await expect(fx.service.leaveTeam("T1", "owner")).rejects.toMatchObject({ code: "owner_cannot_leave" });
  assert.deepEqual(await fx.service.leaveTeam("T1", "admin"), { ok: true });
  assert.equal(fx.members.has("admin"), false);
});


test("a team allows at most five active or reserved sub administrators", async () => {
  const fx = fixture();
  for (let i = 2; i <= 5; i += 1) fx.members.set(`admin${i}`, { team_id: "T1", user_id: `admin${i}`, role: "admin" });
  await expect(fx.service.createInvite("T1", "owner", { kind: "admin" })).rejects.toMatchObject({ code: "sub_admin_limit_reached" });
});

test("pending sub-admin invitations reserve the remaining slots", async () => {
  const fx = fixture();
  fx.members.set("admin2", { team_id: "T1", user_id: "admin2", role: "admin" });
  fx.members.set("admin3", { team_id: "T1", user_id: "admin3", role: "admin" });
  fx.members.set("admin4", { team_id: "T1", user_id: "admin4", role: "admin" });
  fx.setPending([{ id: "inv_pending", kind: "admin" }]);
  await expect(fx.service.createInvite("T1", "owner", { kind: "admin" })).rejects.toMatchObject({ code: "sub_admin_limit_reached" });
});

test("management exposes the five-person sub-admin capacity", async () => {
  const fx = fixture();
  fx.setPending([{ id: "inv_pending", kind: "admin" }]);
  const result = await fx.service.management("T1", "owner");
  assert.equal(result.maxSubAdmins, 5);
  assert.equal(result.subAdminCount, 1);
  assert.equal(result.pendingSubAdminInvites, 1);
  assert.equal(result.subAdminSlotsRemaining, 3);
  assert.equal(result.canInviteSubAdmin, true);
});

test("owner transfer that keeps the previous owner refuses a sixth sub administrator", async () => {
  const fx = fixture();
  for (let i = 2; i <= 5; i += 1) fx.members.set(`admin${i}`, { team_id: "T1", user_id: `admin${i}`, role: "admin" });
  await expect(fx.service.createInvite("T1", "owner", { kind: "transfer", creatorExit: false })).rejects.toMatchObject({ code: "sub_admin_limit_transfer" });
});
