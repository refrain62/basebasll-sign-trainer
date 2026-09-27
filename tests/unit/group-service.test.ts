import { expect, test } from "vitest";
import assert from "node:assert/strict";
import { createGroupService } from "../../src/services/group-service.ts";

function fixture() {
  const calls = [];
  const groupRepository = {
    nextSortOrder: async (teamId) => { calls.push(["nextSortOrder", teamId]); return 20; },
    create: async (value) => { calls.push(["create", value]); return 7; },
    getPublicById: async (teamId, groupId) => ({ id: groupId, name: "Aサイン", teamId }),
    findById: async () => null,
    update: async () => {},
    softDelete: async () => {}
  };
  const auditRepository = {
    record: async (...args) => calls.push(["audit", ...args])
  };
  return { calls, groupRepository, auditRepository, service: createGroupService({ groupRepository, auditRepository }) };
}

test("group service validates input and orchestrates repositories without D1", async () => {
  const { service, calls } = fixture();
  const group = await service.create("team1", {
    name: "  Aサイン  ",
    description: " 基本サイン ",
    youtubeUrl: "https://youtu.be/JYT0yxyvHJU"
  });
  assert.equal(group.id, 7);
  assert.deepEqual(calls[0], ["nextSortOrder", "team1"]);
  assert.deepEqual(calls[1][1], {
    teamId: "team1",
    name: "Aサイン",
    description: "基本サイン",
    youtubeUrl: "https://www.youtube.com/watch?v=JYT0yxyvHJU",
    videoId: "JYT0yxyvHJU",
    sortOrder: 20
  });
  assert.equal(calls[2][0], "audit");
});

test("group service rejects invalid YouTube URL before repository mutation", async () => {
  const { service, calls } = fixture();
  await expect(service.create("team1", { name: "A", youtubeUrl: "https://evil.example/video" })).rejects.toMatchObject({ code: "invalid_youtube", status: 400 });
  assert.equal(calls.length, 0);
});
