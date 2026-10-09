import { expect, test } from "@playwright/test";
import { baseOrigin, baseURL, guardBrowser, routeOnly } from "./helpers.ts";

const crawlPages = ["/", "/plans", "/install", "/support", "/terms", "/privacy", "/external-transmission", "/legal", "/contact"];

function isFetchableInternalHref(raw: string): boolean {
  if (!raw || raw.startsWith("#") || raw.startsWith("mailto:") || raw.startsWith("tel:") || raw.startsWith("javascript:")) return false;
  const url = new URL(raw, baseURL);
  return url.origin === baseOrigin;
}

test("all first-party links exposed by the LP resolve successfully", async ({ page, request }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium", "link crawler only needs one browser");
  const hrefs = new Set<string>();

  for (const route of crawlPages) {
    await page.goto(route, { waitUntil: "domcontentloaded" });
    const pageHrefs = await page.locator("a[href]").evaluateAll((anchors) => anchors.map((anchor) => anchor.getAttribute("href") || ""));
    for (const href of pageHrefs) if (isFetchableInternalHref(href)) hrefs.add(href);
  }

  expect(hrefs.size).toBeGreaterThan(8);

  for (const href of [...hrefs].sort()) {
    const url = new URL(href, baseURL);
    const response = await request.get(`${baseURL}${routeOnly(href)}`);
    expect(response.status(), `${href} should not be a broken link`).toBeLessThan(400);

    const contentType = response.headers()["content-type"] || "";
    if (contentType.includes("text/html")) {
      const html = await response.text();
      expect(html, href).not.toContain("ページを読み込めませんでした。");
      if (url.hash) {
        const id = decodeURIComponent(url.hash.slice(1));
        const escapedId = id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        expect(html, `${href} points to a missing fragment`).toMatch(new RegExp(`id=["']${escapedId}["']`));
      }
    }
  }
});

test("all first-party assets referenced by public pages return successfully", async ({ page, request }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium", "asset crawler only needs one browser");
  const assets = new Set<string>();

  for (const route of crawlPages) {
    await page.goto(route, { waitUntil: "domcontentloaded" });
    const refs = await page.locator("img[src], script[src], link[href]").evaluateAll((nodes) => nodes.map((node) => {
      if (node instanceof HTMLImageElement || node instanceof HTMLScriptElement) return node.getAttribute("src") || "";
      return node.getAttribute("href") || "";
    }));
    for (const ref of refs) {
      if (!ref) continue;
      const url = new URL(ref, baseURL);
      if (url.origin === baseOrigin && url.pathname !== "/") assets.add(`${url.pathname}${url.search}`);
    }
  }

  expect(assets.size).toBeGreaterThan(10);
  for (const asset of [...assets].sort()) {
    const response = await request.get(`${baseURL}${asset}`);
    expect(response.status(), asset).toBeLessThan(400);
  }
});

test("desktop shared navigation reaches plans, install and support", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium", "desktop navigation only");
  const guard = guardBrowser(page);

  await page.goto("/");
  for (const [href, expected] of [["/plans", /チームに合った/], ["/install", /チーム全員に/], ["/support", /よくある質問/]] as const) {
    await page.locator(`nav[aria-label="メインナビゲーション"] a[href="${href}"]`).click();
    await expect(page).toHaveURL(new RegExp(`${href.replace("/", "\\/")}/?$`));
    await expect(page.getByRole("heading", { level: 1 }).first()).toContainText(expected);
    await page.goto("/");
  }

  guard.assertClean();
});

test("mobile hamburger menu opens, navigates and closes", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile-chromium", "mobile navigation only");
  const guard = guardBrowser(page);

  await page.goto("/");
  const menuButton = page.locator("#mobile-menu-button");
  await expect(menuButton).toBeVisible();
  await menuButton.click();
  const openMenuButton = page.locator("#mobile-menu-button");
  await expect(openMenuButton).toHaveAttribute("aria-expanded", "true");
  await expect(openMenuButton).toHaveAttribute("aria-label", "メニューを閉じる");
  await expect(page.locator("#mobile-nav")).toHaveClass(/is-open/);

  await page.locator('#mobile-nav a[href="/plans"]').click();
  await expect(page).toHaveURL(/\/plans\/?$/);
  await expect(page.getByRole("heading", { level: 1 }).first()).toContainText(/チームに合った/);

  guard.assertClean();
});
