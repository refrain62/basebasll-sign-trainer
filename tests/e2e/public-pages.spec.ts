import { expect, test } from "@playwright/test";
import { baseURL, expectNoBodyOverflow, guardBrowser } from "./helpers.ts";

const publicPages = [
  { path: "/", title: /SIGN TRAINER/, heading: /見てわかる/ },
  { path: "/plans", title: /料金プラン/, heading: /チームに合った/ },
  { path: "/install", title: /チーム共有・ホーム画面への追加 \| SIGN TRAINER/, heading: /チーム全員に/ },
  { path: "/support", title: /よくある質問/, heading: /よくある質問/ },
  { path: "/terms", title: /利用規約/, heading: /利用規約/ },
  { path: "/privacy", title: /プライバシーポリシー/, heading: /プライバシーポリシー/ },
  { path: "/external-transmission", title: /外部送信/, heading: /外部送信について/ },
  { path: "/legal", title: /運営者情報/, heading: /運営者情報/ },
  { path: "/contact", title: /お問い合わせ/, heading: /お問い合わせ/ }
] as const;

for (const item of publicPages) {
  test(`${item.path} renders without browser or HTTP errors`, async ({ page }) => {
    const guard = guardBrowser(page);
    const response = await page.goto(item.path, { waitUntil: "networkidle" });

    expect(response, `${item.path} should return a document response`).not.toBeNull();
    expect(response!.status(), `${item.path} should return 200`).toBe(200);
    expect(response!.headers()["content-type"]).toContain("text/html");
    await expect(page).toHaveTitle(item.title);
    await expect(page.getByRole("heading", { level: 1 }).first()).toContainText(item.heading);
    await expect(page.locator("body")).not.toContainText("ページを読み込めませんでした。");
    await expect(page.locator("header.site-header")).toBeVisible();
    await expect(page.locator("footer.site-footer")).toBeVisible();
    await expectNoBodyOverflow(page);

    guard.assertClean();
  });
}

test("marketing pages emit the expected canonical URLs", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium", "HTTP/metadata regression only needs one browser");
  for (const item of publicPages.slice(0, 4)) {
    await page.goto(item.path);
    const canonical = await page.locator('link[rel="canonical"]').getAttribute("href");
    const expectedPath = item.path === "/" ? "/" : item.path;
    expect(canonical).toBe(`https://basebasll-sign-trainer.refrain62.workers.dev${expectedPath}`);
  }
});

test("the previous broken-page signature never appears on public LP routes", async ({ request }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium", "HTTP route regression only needs one browser");
  const aliases = [
    "/plans", "/plans/", "/plans.html",
    "/install", "/install/", "/install.html",
    "/support", "/support/", "/support.html",
    "/terms", "/privacy", "/external-transmission", "/legal", "/contact"
  ];

  for (const route of aliases) {
    const response = await request.get(`${baseURL}${route}`);
    expect(response.status(), route).toBe(200);
    expect(response.headers()["content-type"], route).toContain("text/html");
    expect(await response.text(), route).not.toContain("ページを読み込めませんでした。");
  }
});
