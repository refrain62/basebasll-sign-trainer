import { describe, expect, test } from "vitest";
import { readFileSync } from "node:fs";

const migration = readFileSync("migrations/0018_sample_team_groups.sql", "utf8");

describe("sample team seed", () => {
  test("keeps the same sample team catalog across environments", () => {
    expect(migration).toContain("6BnWv2K3zo");
    for (const name of ["バッティングサイン", "守備サイン（ランナーなし）", "守備サイン（2塁ランナーあり）", "ピッチングサイン", "走塁サイン"]) {
      expect(migration).toContain(name);
    }
  });

  test("assigns the existing offensive signs to batting and running groups", () => {
    expect(migration).toContain("id IN (2,3,4,5,6,7,9,10)");
    expect(migration).toContain("id IN (1,8)");
    expect(migration).toContain("NOT EXISTS");
  });
});
