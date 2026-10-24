import assert from "node:assert/strict";
import { test } from "vitest";
import { enforceRateLimit } from "../../src/security/rate-limit.ts";

function atomicRateLimitDb() {
  const rows = new Map<string, { window_start: number; count: number }>();
  return {
    prepare(sql: string) {
      return {
        bind(...params: unknown[]) {
          return {
            async first() {
              if (!sql.includes("RETURNING window_start,count")) return null;
              const [key, now, cutoff] = params as [string, number, number];
              const current = rows.get(key);
              const next = !current || current.window_start <= cutoff
                ? { window_start: now, count: 1 }
                : { window_start: current.window_start, count: current.count + 1 };
              rows.set(key, next);
              return next;
            },
            async run() {
              if (sql.startsWith("DELETE FROM auth_rate_limits")) rows.clear();
              return { success: true, meta: { changes: 0 } };
            }
          };
        }
      };
    }
  };
}

test("authentication rate limits count concurrent attempts atomically", async () => {
  const db = atomicRateLimitDb();
  const request = new Request("https://example.com/api/system/auth", {
    headers: { "cf-connecting-ip": "198.51.100.10" }
  });
  const results = await Promise.all(
    Array.from({ length: 5 }, () => enforceRateLimit({
      db,
      sessionSecret: "SignTrainerUnitTestSessionSecret2026",
      request,
      scope: "system-auth",
      identity: "global",
      maxAttempts: 2,
      windowSeconds: 900
    }))
  );

  assert.equal(results.filter((response) => response === null).length, 2);
  assert.equal(results.filter((response) => response?.status === 429).length, 3);
});
