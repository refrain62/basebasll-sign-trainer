import fs from "node:fs";

const ORIGIN = "https://basebasll-sign-trainer.refrain62.workers.dev";
const OG_IMAGE = `${ORIGIN}/og.jpg`;
const failures: string[] = [];

const indexedPages = [
  { name: "index", canonical: `${ORIGIN}/` },
  { name: "plans", canonical: `${ORIGIN}/plans` },
  { name: "install", canonical: `${ORIGIN}/install` },
  { name: "support", canonical: `${ORIGIN}/support` }
] as const;

function expectIncludes(source: string, needle: string, label: string): void {
  if (!source.includes(needle)) failures.push(`${label}: missing ${needle}`);
}

for (const page of indexedPages) {
  for (const file of [`pages/${page.name}.html`, `public/${page.name}.html`, `public/__pages/${page.name}.txt`]) {
    if (!fs.existsSync(file)) {
      failures.push(`${file}: missing indexed page artifact`);
      continue;
    }
    const html = fs.readFileSync(file, "utf8");
    expectIncludes(html, '<meta name="description"', file);
    expectIncludes(html, '<meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1"', file);
    expectIncludes(html, `<link rel="canonical" href="${page.canonical}"`, file);
    expectIncludes(html, '<meta property="og:type" content="website"', file);
    expectIncludes(html, '<meta property="og:locale" content="ja_JP"', file);
    expectIncludes(html, '<meta property="og:site_name" content="SIGN TRAINER"', file);
    expectIncludes(html, `<meta property="og:url" content="${page.canonical}"`, file);
    expectIncludes(html, `<meta property="og:image" content="${OG_IMAGE}"`, file);
    expectIncludes(html, '<meta name="twitter:card" content="summary_large_image"', file);
    expectIncludes(html, '<meta name="twitter:title"', file);
    expectIncludes(html, '<meta name="twitter:description"', file);
    expectIncludes(html, `<meta name="twitter:image" content="${OG_IMAGE}"`, file);
  }
}

const indexTemplate = fs.readFileSync("pages/index.html", "utf8");
expectIncludes(indexTemplate, '<script type="application/ld+json">', "pages/index.html");
expectIncludes(indexTemplate, '"@type":"WebSite"', "pages/index.html");
expectIncludes(indexTemplate, '"@type":"WebApplication"', "pages/index.html");

const verificationPath = "public/googlee59132d0fb2c06ae.html";
if (!fs.existsSync(verificationPath)) failures.push(`${verificationPath}: Google Search Console verification file is missing`);
else if (fs.readFileSync(verificationPath, "utf8").trim() !== "google-site-verification: googlee59132d0fb2c06ae.html") {
  failures.push(`${verificationPath}: verification content changed`);
}

const robots = fs.readFileSync("public/robots.txt", "utf8");
expectIncludes(robots, "User-agent: *", "public/robots.txt");
expectIncludes(robots, "Allow: /", "public/robots.txt");
expectIncludes(robots, `Sitemap: ${ORIGIN}/sitemap.xml`, "public/robots.txt");

const sitemap = fs.readFileSync("public/sitemap.xml", "utf8");
for (const page of indexedPages) expectIncludes(sitemap, `<loc>${page.canonical}</loc>`, "public/sitemap.xml");
if ((sitemap.match(/<loc>/g) || []).length !== indexedPages.length) {
  failures.push(`public/sitemap.xml: expected exactly ${indexedPages.length} indexable URLs`);
}

const pageServer = fs.readFileSync("src/http/pages.ts", "utf8");
for (const pathname of ["/support", "/support.html"]) {
  if (!pageServer.includes(`"${pathname}"`)) failures.push(`src/http/pages.ts: ${pathname} must be indexable`);
}

if (failures.length) {
  console.error("SEO check failed:\n- " + failures.join("\n- "));
  process.exit(1);
}

console.log(`SEO check passed: ${indexedPages.length} indexable pages, Search Console verification, robots.txt and sitemap.xml are aligned.`);
