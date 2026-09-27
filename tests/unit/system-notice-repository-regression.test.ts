import { describe, expect, test } from "vitest";
import { readFileSync } from "node:fs";

const source = readFileSync("src/repositories/system-notice-repository.ts", "utf8");

describe("system notice repository regression", () => {
  test("ISO timestamps are normalized before comparing with SQLite CURRENT_TIMESTAMP", () => {
    expect(source).toContain("datetime(publish_at) <= CURRENT_TIMESTAMP");
    expect(source).toContain("datetime(expires_at) > CURRENT_TIMESTAMP");
  });
});
