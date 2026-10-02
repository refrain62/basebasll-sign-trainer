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


describe("sample team pbkdf2 compatibility migration", () => {
  const initialSeed = readFileSync("migrations/0002_seed_sample.sql", "utf8");
  const compatMigration = readFileSync("migrations/0022_cloudflare_pbkdf2_compat.sql", "utf8");

  test("uses a Workers-supported 100000-iteration hash for the sample passphrase", () => {
    expect(initialSeed).toContain("pbkdf2-sha256$100000$Hj9WSJTt-MnUftwYy2hejA$iEBaRTX_oGhIXbjAW1q-oZ6PYoHrWev0ASbdUFa-GVY");
    expect(compatMigration).toContain("pbkdf2-sha256$120000$Hj9WSJTt-MnUftwYy2hejA$sW69qlUk73wWVGHLJHMQpQfpsDSOuYzJSZqW0m_oQfQ");
    expect(compatMigration).toContain("pbkdf2-sha256$100000$Hj9WSJTt-MnUftwYy2hejA$iEBaRTX_oGhIXbjAW1q-oZ6PYoHrWev0ASbdUFa-GVY");
  });
});
