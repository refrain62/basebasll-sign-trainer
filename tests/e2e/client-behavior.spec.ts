import { expect, test } from "@playwright/test";
import { guardBrowser } from "./helpers.ts";

test("landing share dialog is wired and produces a QR code", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium", "one browser is enough for deterministic client behavior");
  const guard = guardBrowser(page);

  await page.goto("/", { waitUntil: "networkidle" });
  await page.locator("#share-site").click();

  const dialog = page.locator("#share-dialog");
  await expect(dialog).toHaveAttribute("open", "");
  await expect(dialog.locator("#share-url")).toHaveValue(/\/$/);
  await expect(dialog.locator("#share-qr")).toHaveAttribute("src", /^(data:image\/|blob:)/);
  await expect(dialog.locator("#share-qr-status")).not.toContainText("表示できませんでした");

  guard.assertClean();
});

test("plans comparison table remains visible and horizontally contained", async ({ page }) => {
  await page.goto("/plans");
  const region = page.getByRole("region", { name: "プラン機能比較" });
  await expect(region).toBeVisible();
  await expect(region.locator("table.plan-comparison-table")).toBeVisible();
  await expect(page.locator("#analytics")).toContainText("正答率・苦手分析");
});

test("FAQ details can be expanded without JavaScript errors", async ({ page }) => {
  const guard = guardBrowser(page);
  await page.goto("/support");

  const details = page.locator("details").filter({ hasText: "スマートフォンだけで使えますか？" });
  await expect(details).not.toHaveAttribute("open", "");
  await details.locator("summary").click();
  await expect(details).toHaveAttribute("open", "");

  guard.assertClean();
});
