import { expect, test } from "vitest";
import assert from "node:assert/strict";
import { createVideoService } from "../../src/services/video-service.ts";

test("video service rejects when the database-side one-video guard wins a race", async () => {
  const calls = [];
  const service = createVideoService({
    signRepository: { findById: async () => ({ id: 1 }), getWithVideos: async () => ({}) },
    videoRepository: {
      nextSortOrder: async () => 10,
      create: async () => null
    },
    auditRepository: { record: async (...args) => calls.push(args) }
  });

  await expect(service.create("team1", 1, { youtubeUrl: "https://youtu.be/JYT0yxyvHJU" }, null, { maxItems: 1 }))
    .rejects.toMatchObject({ code: "feature_not_available", status: 403 });
  assert.equal(calls.length, 0);
});
