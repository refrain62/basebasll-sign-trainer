import { expect, test } from "vitest";
import { readFileSync } from "node:fs";

const source = readFileSync("client/admin.ts", "utf8");
const css = readFileSync("public/styles.css", "utf8");

test("system team cards show the assigned plan as a prominent notice-style block", () => {
  expect(source).toContain('system-team-plan-badge--${esc(planCode)}');
  expect(source).toContain('<small>現在のプラン</small><strong>${esc(plan.name || "Free")}</strong>');
  expect(source).toContain('planSummary');
  expect(css).toContain('.admin-team-card > .system-team-plan-badge');
  expect(css).toContain('.system-team-plan-badge--team_plus');
  expect(css).toContain('.system-team-plan-badge--team_pro');
  expect(css).toContain('.system-team-plan-copy');
});
