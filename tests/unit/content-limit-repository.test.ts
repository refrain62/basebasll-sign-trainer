import { test } from "vitest";
import assert from "node:assert/strict";
import { createGroupRepository } from "../../src/repositories/group-repository.ts";
import { createSignRepository } from "../../src/repositories/sign-repository.ts";
import { createVideoRepository } from "../../src/repositories/video-repository.ts";

function fakeDb() {
  const calls = [];
  return {
    calls,
    prepare(sql) {
      return {
        bind(...args) {
          calls.push({ sql, args });
          return { async run() { return { meta: { changes: 0 } }; } };
        }
      };
    }
  };
}

test("group creation uses an atomic count guard when a plan limit is supplied", async () => {
  const db = fakeDb();
  const id = await createGroupRepository(db).create({ teamId: "Team1234", name: "攻撃", description: "", youtubeUrl: "", videoId: "", sortOrder: 10, maxItems: 1 });
  assert.equal(id, null);
  assert.match(db.calls[0].sql, /INSERT INTO sign_groups[\s\S]*SELECT[\s\S]*COUNT\(\*\)/);
  assert.equal(db.calls[0].args.at(-1), 1);
});

test("sign creation uses an atomic count guard when a plan limit is supplied", async () => {
  const db = fakeDb();
  const id = await createSignRepository(db).create({ teamId: "Team1234", name: "攻撃", sortOrder: 10, groupId: null, maxItems: 10 });
  assert.equal(id, null);
  assert.match(db.calls[0].sql, /INSERT INTO signs[\s\S]*SELECT[\s\S]*COUNT\(\*\)/);
  assert.equal(db.calls[0].args.at(-1), 10);
});

test("video creation uses an atomic count guard when a per-sign limit is supplied", async () => {
  const db = fakeDb();
  const id = await createVideoRepository(db).create({ signId: 7, youtubeUrl: "https://youtu.be/JYT0yxyvHJU", videoId: "JYT0yxyvHJU", sortOrder: 10, comment: "", maxItems: 1 });
  assert.equal(id, null);
  assert.match(db.calls[0].sql, /INSERT INTO sign_videos[\s\S]*SELECT[\s\S]*COUNT\(\*\)/);
  assert.equal(db.calls[0].args.at(-1), 1);
});
