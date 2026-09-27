import { expect, test } from "vitest";
import assert from "node:assert/strict";
import { createAccountService } from "../../src/services/account-service.ts";

function serviceFixture(overrides = {}) {
  const users = new Map();
  const identities = new Map();
  const calls = [];
  const userRepository = {
    async findByIdentity(provider, subject) { return identities.get(`${provider}:${subject}`) || null; },
    async findById(id) { return users.get(id) || null; },
    async createWithIdentity(input) {
      calls.push(["createWithIdentity", input]);
      const row = { id: input.userId, display_name: input.displayName, email: input.email, avatar_url: input.avatarUrl, status: "active", session_version: 1 };
      users.set(input.userId, row);
      identities.set(`${input.provider}:${input.subject}`, row);
    },
    async updateFromIdentity(input) {
      calls.push(["updateFromIdentity", input]);
      const row = users.get(input.userId);
      if (!row) return null;
      row.display_name = input.displayName || row.display_name;
      row.email = input.email || row.email;
      row.avatar_url = input.avatarUrl || row.avatar_url;
      return row;
    },
    publicUser(row) { return row ? { id: row.id, displayName: row.display_name, email: row.email || "" } : null; },
    async listIdentities() { return []; },
    async recordLegalConsent(userId, termsVersion, privacyVersion) {
      calls.push(["recordLegalConsent", userId, termsVersion, privacyVersion]);
      const row = users.get(userId);
      if (row) { row.terms_version = termsVersion; row.privacy_version = privacyVersion; row.legal_accepted_at = "2026-09-24T00:00:00Z"; }
    },
    async softDelete() { calls.push(["softDelete"]); return true; }
  };
  const membershipRepository = {
    async listForUser() { return []; },
    async ownedTeams() { return []; }
  };
  const teamRows = new Map();
  const teamRepository = {
    async idExists(id) { return teamRows.has(id); },
    async findById(id) { return teamRows.get(id) || { id, name: "Test", status: "active" }; },
    publicTeam(row) { return { id: row.id, name: row.name, status: row.status }; }
  };
  const provisioningRepository = {
    async createOwnedTeam(input) { calls.push(["createOwnedTeam", input]); teamRows.set(input.teamId, { id: input.teamId, name: input.name, status: "active" }); }
  };
  const auditRepository = { async record(...args) { calls.push(["audit", ...args]); } };
  const service = createAccountService({
    userRepository,
    membershipRepository,
    teamRepository,
    provisioningRepository,
    auditRepository,
    hashPassword: async (value) => `hash:${value}`,
    createUserId: () => "u_testuser123",
    createTeamId: () => "TeamABC123",
    ...overrides
  });
  return { service, users, identities, calls, userRepository, membershipRepository };
}

test("account service creates OAuth identity atomically and does not auto-link by email", async () => {
  const { service, calls } = serviceFixture();
  const user = await service.upsertOAuthUser({ provider: "google", subject: "google-sub", email: "coach@example.com", emailVerified: true, displayName: "Coach", avatarUrl: "" });
  assert.equal(user.id, "u_testuser123");
  const create = calls.find(([name]) => name === "createWithIdentity");
  assert.equal(create[1].provider, "google");
  assert.equal(create[1].subject, "google-sub");
  assert.ok(calls.some(([name]) => name === "audit"));
});

test("account service reuses an existing provider subject", async () => {
  const fx = serviceFixture();
  fx.users.set("u_existing123", { id: "u_existing123", display_name: "Old", email: "old@example.com", status: "active" });
  fx.identities.set("line:U123", fx.users.get("u_existing123"));
  const user = await fx.service.upsertOAuthUser({ provider: "line", subject: "U123", email: "", emailVerified: false, displayName: "New Name", avatarUrl: "" });
  assert.equal(user.id, "u_existing123");
  assert.equal(user.displayName, "New Name");
  assert.equal(fx.calls.some(([name]) => name === "createWithIdentity"), false);
});

test("self-service team creation provisions an owner-managed team without a usable shared admin password", async () => {
  const fx = serviceFixture();
  fx.users.set("u_owner123", { id: "u_owner123", display_name: "Owner", email: "", status: "active" });
  const result = await fx.service.createTeam("u_owner123", { name: " 熊本ジュニア ", passphrase: "ホームラン" });
  assert.equal(result.team.id, "TeamABC123");
  const provision = fx.calls.find(([name]) => name === "createOwnedTeam")[1];
  assert.equal(provision.userId, "u_owner123");
  assert.equal(provision.passphraseHash, "hash:ホームラン");
  assert.match(provision.adminHash, /^hash:/);
  assert.notEqual(provision.adminHash, "hash:ホームラン");
});

test("account deletion is blocked while the user owns a team", async () => {
  const fx = serviceFixture();
  fx.users.set("u_owner123", { id: "u_owner123", display_name: "Owner", status: "active" });
  fx.membershipRepository.ownedTeams = async () => [{ id: "T1", name: "Owned Team" }];
  await expect(fx.service.deleteAccount("u_owner123")).rejects.toMatchObject({ code: "owned_teams_remaining", status: 409 });
  assert.equal(fx.calls.some(([name]) => name === "softDelete"), false);
});

test("account deletion detects an ownership race even after the pre-check", async () => {
  const fx = serviceFixture();
  fx.users.set("u_admin123", { id: "u_admin123", display_name: "Admin", status: "active" });
  let checks = 0;
  fx.membershipRepository.ownedTeams = async () => (++checks === 1 ? [] : [{ id: "T2", name: "Newly Owned" }]);
  fx.userRepository.softDelete = async () => false;
  await expect(fx.service.deleteAccount("u_admin123")).rejects.toMatchObject({ code: "owned_teams_remaining" });
});


test("OAuth consent versions are recorded with the account", async () => {
  const fx = serviceFixture();
  await fx.service.upsertOAuthUser(
    { provider: "google", subject: "consent-sub", email: "coach@example.com", emailVerified: true, displayName: "Coach", avatarUrl: "" },
    { termsVersion: "2026-09-24", privacyVersion: "2026-09-24" }
  );
  assert.ok(fx.calls.some((call) => call[0] === "recordLegalConsent" && call[2] === "2026-09-24" && call[3] === "2026-09-24"));
});

test("team creation can require current legal consent", async () => {
  const fx = serviceFixture();
  fx.users.set("u_owner123", { id: "u_owner123", display_name: "Owner", status: "active", terms_version: "2026-09-24", privacy_version: "2026-09-24", legal_accepted_at: "2026-09-24T00:00:00Z" });
  assert.equal(await fx.service.assertLegalConsent("u_owner123", "2026-09-24", "2026-09-24"), true);
  await expect(fx.service.assertLegalConsent("u_owner123", "2027-01-01", "2026-09-24")).rejects.toMatchObject({ code: "legal_consent_required", status: 428 });
});


test("account dashboard decorates team memberships with plan summaries when entitlements are available", async () => {
  const entitlementService = {
    async planSummaries(ids) { return Object.fromEntries(ids.map((id) => [id, { code: "free", name: "Free", isFree: true }])); }
  };
  const fx = serviceFixture({ entitlementService });
  fx.users.set("u_admin123", { id: "u_admin123", display_name: "Admin", status: "active" });
  fx.membershipRepository.listForUser = async () => [{ teamId: "T1", teamName: "Team", role: "admin" }];
  const dashboard = await fx.service.dashboard("u_admin123");
  assert.equal(dashboard.teams[0].plan.code, "free");
  assert.equal(dashboard.teams[0].plan.name, "Free");
});
