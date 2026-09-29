import { describe, expect, test } from "vitest";
import { readFileSync } from "node:fs";

const migration = readFileSync("migrations/0021_plan_content_limits.sql", "utf8");
const plans = readFileSync("pages/plans.html", "utf8");
const controller = readFileSync("src/controllers/team-admin-controller.ts", "utf8");

describe("plan content limits", () => {
  test("Free / Plus / Pro sign limits are 10 / 20 / unlimited", () => {
    expect(migration).toContain("('free','sign_count',1,10)");
    expect(migration).toContain("('team_plus','sign_count',1,20)");
    expect(migration).toContain("('team_pro','sign_count',1,NULL)");
    expect(plans).toContain("最大10個");
    expect(plans).toContain("最大20個");
  });

  test("Free / Plus / Pro group limits are 1 / 3 / unlimited", () => {
    expect(migration).toContain("('free','multiple_sign_groups',0,1)");
    expect(migration).toContain("('team_plus','multiple_sign_groups',1,3)");
    expect(migration).toContain("('team_pro','multiple_sign_groups',1,NULL)");
    expect(plans).toContain("最大3グループ");
    expect(plans).toContain("無制限");
  });

  test("API enforces sign and group limits instead of relying only on UI", () => {
    expect(controller).toContain("group_limit_reached");
    expect(controller).toContain("sign_limit_reached");
  });
});
