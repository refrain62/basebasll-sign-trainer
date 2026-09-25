import { test } from "vitest";
import assert from "node:assert/strict";
import { createSubscriptionRepository } from "../../src/repositories/subscription-repository.ts";
import { getGroup, getSignWithVideos } from "../../src/repositories/team-repository.ts";

test("bulk team default provisioning uses a fixed two-statement batch", async () => {
  for (const size of [2, 50]) {
    const prepared: Array<{ sql: string; args: unknown[] }> = [];
    let batchCalls = 0;
    let batchSize = 0;
    const db = {
      prepare(sql: string) {
        return {
          bind(...args: unknown[]) {
            const statement = { sql, args };
            prepared.push(statement);
            return statement;
          }
        };
      },
      async batch(statements: unknown[]) {
        batchCalls += 1;
        batchSize = statements.length;
        return statements.map(() => ({ success: true }));
      }
    };

    const repository = createSubscriptionRepository(db);
    await repository.ensureTeamDefaultsForTeams(Array.from({ length: size }, (_, i) => `T${i + 1}`));

    assert.equal(prepared.length, 2);
    assert.equal(batchCalls, 1);
    assert.equal(batchSize, 2);
    assert.match(prepared[0].sql, /INSERT OR IGNORE INTO team_subscriptions/);
    assert.match(prepared[1].sql, /INSERT OR IGNORE INTO team_usage/);
  }
});

function queryDb({ sign = null, videos = [], group = null } = {}) {
  const queries: string[] = [];
  return {
    queries,
    prepare(sql: string) {
      queries.push(sql);
      return {
        bind() {
          return {
            async first() {
              return /FROM sign_groups/.test(sql) ? group : sign;
            },
            async all() {
              return { results: videos };
            }
          };
        }
      };
    }
  };
}

test("getGroup fetches one group with one query instead of loading the full group list", async () => {
  const db = queryDb({
    group: { id: 7, name: "Group", description: "desc", explanation_youtube_url: "", explanation_youtube_video_id: "", sort_order: 10, enabled: 1 }
  });

  const result = await getGroup(db, "T1", 7);

  assert.equal(db.queries.length, 1);
  assert.match(db.queries[0], /WHERE id=\? AND team_id=\?/);
  assert.equal(result.id, 7);
  assert.equal(result.name, "Group");
});

test("getSignWithVideos uses exactly two queries regardless of video count", async () => {
  for (const videoCount of [0, 20]) {
    const videos = Array.from({ length: videoCount }, (_, index) => ({
      id: index + 1,
      sign_id: 42,
      youtube_url: `https://youtu.be/video${index}`,
      youtube_video_id: `video${index}`,
      sort_order: (index + 1) * 10,
      enabled: 1,
      comment: ""
    }));
    const db = queryDb({
      sign: { id: 42, team_id: "T1", name: "Bunt", sort_order: 10, enabled: 1, group_id: null },
      videos
    });

    const result = await getSignWithVideos(db, "T1", 42);

    assert.equal(db.queries.length, 2);
    assert.match(db.queries[0], /WHERE id=\? AND team_id=\?/);
    assert.match(db.queries[1], /WHERE sign_id=\?/);
    assert.equal(result.dbId, 42);
    assert.equal(result.videoItems.length, videoCount);
  }
});
