import test from "node:test";
import assert from "node:assert/strict";
import { getTeamGroups, getTeamSigns, validGroupId } from "../../src/backend.js";

function fakeDb(handler) {
  return {
    prepare(sql) {
      return {
        bind(...params) {
          return {
            all: async () => ({ results: handler({ sql, params, method: "all" }) ?? [] }),
            first: async () => handler({ sql, params, method: "first" }) ?? null,
            run: async () => handler({ sql, params, method: "run" }) ?? { success: true }
          };
        }
      };
    }
  };
}

test("getTeamGroups maps D1 rows into public group objects", async () => {
  const db = fakeDb(({ sql, params }) => {
    assert.match(sql, /FROM sign_groups/);
    assert.deepEqual(params, ["team1"]);
    return [{ id: 7, name: "Aサイン", description: "説明", explanation_youtube_url: "https://youtu.be/JYT0yxyvHJU", explanation_youtube_video_id: "JYT0yxyvHJU", sort_order: 10, enabled: 1 }];
  });
  assert.deepEqual(await getTeamGroups(db, "team1"), [{ id: 7, name: "Aサイン", description: "説明", youtubeUrl: "https://youtu.be/JYT0yxyvHJU", videoId: "JYT0yxyvHJU", sortOrder: 10, enabled: true }]);
});

test("validGroupId only accepts groups owned by the team", async () => {
  const db = fakeDb(({ params, method }) => method === "first" && params[0] === 7 && params[1] === "team1" ? { id: 7 } : null);
  assert.equal(await validGroupId(db, "team1", 7), 7);
  assert.equal(await validGroupId(db, "team1", ""), null);
  assert.equal(await validGroupId(db, "team1", "bad"), null);
  assert.equal(await validGroupId(db, "other", 7), null);
});

test("getTeamSigns keeps group IDs and video comments associated with each sign", async () => {
  const db = fakeDb(({ sql }) => {
    if (sql.includes("FROM signs WHERE")) {
      return [
        { id: 1, name: "サイン1", sort_order: 10, enabled: 1, group_id: 7 },
        { id: 2, name: "サイン2", sort_order: 20, enabled: 0, group_id: null }
      ];
    }
    if (sql.includes("FROM sign_videos")) {
      return [
        { id: 11, sign_id: 1, youtube_url: "https://youtu.be/JYT0yxyvHJU", youtube_video_id: "JYT0yxyvHJU", sort_order: 10, enabled: 1, comment: "正面" }
      ];
    }
    return [];
  });
  const signs = await getTeamSigns(db, "team1");
  assert.equal(signs.length, 2);
  assert.equal(signs[0].groupId, 7);
  assert.equal(signs[0].videoItems[0].comment, "正面");
  assert.equal(signs[1].groupId, null);
  assert.deepEqual(signs[1].videos, []);
});
