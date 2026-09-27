import { describe, expect, test } from "vitest";
import { readFileSync } from "node:fs";

const playerController = readFileSync("src/controllers/player-controller.ts", "utf8");
const playerRoutes = readFileSync("src/routes/player.ts", "utf8");
const teamSource = readFileSync("client/team.ts", "utf8");
const premiumSource = readFileSync("src/premium-modules/module-sources.ts", "utf8");
const migration = readFileSync("migrations/0017_result_sharing.sql", "utf8");
const lp = readFileSync("pages/index.html", "utf8");
const plans = readFileSync("pages/plans.html", "utf8");
const adminSource = readFileSync("client/admin.ts", "utf8");

describe("premium feature access regression", () => {
  test("premium module endpoint rechecks player session and Entitlement on the Worker", () => {
    expect(playerRoutes).toContain('playerRoutes.get("/premium-module"');
    expect(playerController).toContain('readRoleSession(request, env, PLAYER_COOKIE, "player")');
    expect(playerController).toContain("services.entitlements.assertFeature(teamId, module.feature");
    expect(playerController).toContain('"cache-control": "private, no-store, max-age=0"');
  });

  test("Pro analytics algorithm is not bundled in the normal team client", () => {
    expect(teamSource).not.toContain("function collectPracticeAnalytics");
    expect(teamSource).not.toContain("export function analyzePractice");
    expect(teamSource).toContain('loadPremiumModule("analytics")');
    expect(premiumSource).toContain("export function analyzePractice");
  });

  test("Plus gets text sharing while image sharing remains Pro-only", () => {
    expect(migration).toContain("('team_plus','result_text_share',1,NULL)");
    expect(migration).toContain("('team_plus','result_image_share',0,0)");
    expect(migration).toContain("('team_pro','result_text_share',1,NULL)");
    expect(migration).toContain("('team_pro','result_image_share',1,NULL)");
    expect(teamSource).toContain('loadPremiumModule("result-text")');
    expect(teamSource).toContain('loadPremiumModule("result-image")');
  });

  test("LP keeps premium discovery while detailed plan copy lives on the plan page", () => {
    expect(lp).toContain('href="/plans#plus"');
    expect(lp).toContain('href="/plans#pro"');
    expect(plans).toContain('id="result-text"');
    expect(plans).toContain('id="result-image"');
    expect(plans).toContain("練習結果を文章で共有");
    expect(plans).toContain("結果・成績を画像カードで共有");
  });

  test("locked premium controls lead to the plan page in a new tab", () => {
    expect(adminSource).toContain('window.open(premiumPlanUrl');
    expect(adminSource).toContain('target="_blank"');
    expect(teamSource).toContain('href="/plans#result-text" target="_blank"');
    expect(teamSource).toContain('href="/plans#analytics" target="_blank"');
  });
});
