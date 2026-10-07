import { describe, expect, test } from "vitest";
import { readFileSync } from "node:fs";

const ORIGIN = "https://basebasll-sign-trainer.refrain62.workers.dev";
const read = (file: string) => readFileSync(file, "utf8");

describe("public SEO and Search Console", () => {
  test("keeps the exact Google HTML verification file at the public root", () => {
    expect(read("public/googlee59132d0fb2c06ae.html").trim()).toBe(
      "google-site-verification: googlee59132d0fb2c06ae.html"
    );
  });

  test("publishes sitemap discovery through robots.txt", () => {
    const robots = read("public/robots.txt");
    expect(robots).toContain(`Sitemap: ${ORIGIN}/sitemap.xml`);
    const sitemap = read("public/sitemap.xml");
    for (const url of [`${ORIGIN}/`, `${ORIGIN}/plans`, `${ORIGIN}/install`, `${ORIGIN}/support`]) {
      expect(sitemap).toContain(`<loc>${url}</loc>`);
    }
  });

  test("gives every indexable marketing page canonical and social metadata", () => {
    const pages = new Map([
      ["index", `${ORIGIN}/`],
      ["plans", `${ORIGIN}/plans`],
      ["install", `${ORIGIN}/install`],
      ["support", `${ORIGIN}/support`]
    ]);
    for (const [name, canonical] of pages) {
      const html = read(`pages/${name}.html`);
      expect(html).toContain(`<link rel="canonical" href="${canonical}"`);
      expect(html).toContain('name="robots" content="index,follow');
      expect(html).toContain('property="og:site_name" content="SIGN TRAINER"');
      expect(html).toContain(`property="og:url" content="${canonical}"`);
      expect(html).toContain('name="twitter:card" content="summary_large_image"');
    }
  });

  test("keeps support FAQ crawlable while private/app pages remain outside the allowlist", () => {
    const server = read("src/http/pages.ts");
    expect(server).toContain('"/support", "/support.html"');
    expect(server).not.toContain('"/account", "/account.html", "/plans"');
  });

  test("publishes WebSite and WebApplication structured data on the landing page", () => {
    const index = read("pages/index.html");
    expect(index).toContain('<script type="application/ld+json">');
    expect(index).toContain('"@type":"WebSite"');
    expect(index).toContain('"@type":"WebApplication"');
  });
});
