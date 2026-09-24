import test from "node:test";
import assert from "node:assert/strict";
import { createSignService } from "../../src/services/sign-service.js";

function makeService() {
  const calls = [];
  const signRepository = {
    nextSortOrder: async () => 10,
    create: async (value) => { calls.push(["sign.create", value]); return 42; },
    hardDelete: async (...args) => calls.push(["sign.hardDelete", ...args]),
    getWithVideos: async () => ({ dbId: 42, name: "ヒットエンドラン" }),
    findById: async () => null,
    update: async () => {},
    softDelete: async () => {}
  };
  const groupRepository = { validId: async () => 7 };
  const videoRepository = { create: async (value) => calls.push(["video.create", value]) };
  const auditRepository = { record: async (...args) => calls.push(["audit", ...args]) };
  return { calls, service: createSignService({ signRepository, groupRepository, videoRepository, auditRepository }) };
}

test("sign service assigns validated group and delegates persistence", async () => {
  const { service, calls } = makeService();
  const sign = await service.create("team1", { name: " ヒットエンドラン ", groupId: 7 });
  assert.equal(sign.dbId, 42);
  assert.deepEqual(calls[0], ["sign.create", { teamId: "team1", name: "ヒットエンドラン", sortOrder: 10, groupId: 7 }]);
  assert.equal(calls.at(-1)[0], "audit");
});

test("sign service rolls back newly created sign when initial video URL is invalid", async () => {
  const { service, calls } = makeService();
  await assert.rejects(() => service.create("team1", { name: "サイン", youtubeUrl: "not youtube" }), (error) => {
    assert.equal(error.code, "invalid_youtube");
    return true;
  });
  assert.deepEqual(calls[1], ["sign.hardDelete", "team1", 42]);
});
