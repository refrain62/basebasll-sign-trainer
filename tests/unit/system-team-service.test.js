import test from "node:test";
import assert from "node:assert/strict";
import { createSystemTeamService } from "../../src/services/system-team-service.js";

function build({ collisions = [] } = {}) {
  const calls = [];
  const ids = ["AAAA111111", "BBBB222222", "CCCC333333"];
  const teamRepository = {
    idExists: async (id) => collisions.includes(id),
    create: async (value) => calls.push(["create", value]),
    findById: async (id) => ({ id, name: "新チーム", status: "active", created_at: "now", updated_at: "now" }),
    publicTeam: (team) => ({ id: team.id, name: team.name, status: team.status }),
    listWithCounts: async () => [],
    updateFromSystem: async () => {},
    softDelete: async () => {}
  };
  const auditRepository = { record: async (...args) => calls.push(["audit", ...args]) };
  const hashPassword = async (value) => `hash:${value}`;
  let i = 0;
  const createId = () => ids[i++];
  return { calls, service: createSystemTeamService({ teamRepository, auditRepository, hashPassword, createId }) };
}

test("system team service retries ID collisions and hashes secrets through injected dependency", async () => {
  const { service, calls } = build({ collisions: ["AAAA111111"] });
  const result = await service.create({ name: " 新チーム ", passphrase: "ホームラン", adminPassword: "admin12345678" });
  assert.equal(result.team.id, "BBBB222222");
  assert.deepEqual(result.urls, { playerPath: "/t/BBBB222222", adminPath: "/t/BBBB222222/admin" });
  assert.deepEqual(calls[0], ["create", {
    teamId: "BBBB222222",
    name: "新チーム",
    passphraseHash: "hash:ホームラン",
    adminHash: "hash:admin12345678"
  }]);
});

test("system team service enforces admin password policy independently of HTTP", async () => {
  const { service } = build();
  await assert.rejects(() => service.create({ name: "T", passphrase: "x", adminPassword: "abcdefghijkl" }), (error) => {
    assert.equal(error.code, "weak_admin_password");
    assert.equal(error.status, 400);
    return true;
  });
});


test("system team list can include plan summaries without coupling the repository to billing", async () => {
  const calls = [];
  const teamRepository = {
    listWithCounts: async () => [{ id: "T1", name: "Team", sign_count: 2, video_count: 3 }]
  };
  const entitlementService = {
    async planSummaries(ids) { calls.push(ids); return { T1: { code: "free", name: "Free", isFree: true } }; }
  };
  const service = createSystemTeamService({ teamRepository, auditRepository: {}, hashPassword: async () => "", entitlementService });
  const teams = await service.list();
  assert.deepEqual(calls[0], ["T1"]);
  assert.equal(teams[0].plan.name, "Free");
});
