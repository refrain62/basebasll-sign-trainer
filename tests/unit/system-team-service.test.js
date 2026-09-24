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
