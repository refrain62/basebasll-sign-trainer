import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("plan comparison copy regression", () => {
  const plans = readFileSync(resolve(process.cwd(), "pages/plans.html"), "utf8");
  const support = readFileSync(resolve(process.cwd(), "pages/support.html"), "utf8");

  it("shows history limits for each plan and limited markers for free", () => {
    expect(plans).toContain("最大10件");
    expect(plans).toContain("最大50件");
    expect(plans).toContain("最大100件");
    expect(plans).toContain('<span class="plan-limited">△</span><small>1グループ</small>');
    expect(plans).toContain('<span class="plan-limited">△</span><small>1本</small>');
  });

  it("shows content limits and Pro sub admin capacity", () => {
    expect(plans).toContain("最大10個");
    expect(plans).toContain("最大20個");
    expect(plans).toContain("最大3グループ");
    expect(plans).toContain("無制限");
    expect(plans).toContain("最大10名");
    expect(support).toContain("Proでは最大10名まで追加できます");
  });
});
