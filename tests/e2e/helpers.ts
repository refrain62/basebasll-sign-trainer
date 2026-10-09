import { expect, type Page } from "@playwright/test";

export const baseURL = (process.env.PLAYWRIGHT_BASE_URL?.replace(/\/$/, "") || "http://127.0.0.1:8787");
export const baseOrigin = new URL(baseURL).origin;

export type BrowserGuard = {
  assertClean(): void;
};

/**
 * Collect browser/runtime failures that are easy to miss in DOM-only tests.
 * Warnings are intentionally allowed; console.error, uncaught JS exceptions and
 * first-party HTTP 4xx/5xx responses fail the test.
 */
export function guardBrowser(page: Page): BrowserGuard {
  const failures: string[] = [];

  page.on("pageerror", (error) => {
    failures.push(`pageerror: ${error.message}`);
  });

  page.on("console", (message) => {
    if (message.type() === "error") failures.push(`console.error: ${message.text()}`);
  });

  page.on("response", (response) => {
    let url: URL;
    try {
      url = new URL(response.url());
    } catch {
      return;
    }
    if (url.origin !== baseOrigin) return;
    if (response.status() >= 400) failures.push(`HTTP ${response.status()}: ${url.pathname}${url.search}`);
  });

  return {
    assertClean() {
      expect(failures, failures.join("\n") || "browser should not report first-party failures").toEqual([]);
    }
  };
}

export async function expectNoBodyOverflow(page: Page): Promise<void> {
  const metrics = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth
  }));
  expect(metrics.scrollWidth, `body overflow: ${metrics.scrollWidth}px > ${metrics.clientWidth}px`).toBeLessThanOrEqual(metrics.clientWidth + 1);
}

export function routeOnly(href: string): string {
  const url = new URL(href, baseURL);
  return `${url.pathname}${url.search}`;
}
