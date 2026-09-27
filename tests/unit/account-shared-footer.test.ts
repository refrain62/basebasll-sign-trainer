import { describe, expect, test } from "vitest";
import { readFileSync } from "node:fs";

describe("account shared footer", () => {
  test("account page uses the canonical site footer component", () => {
    const account = readFileSync("pages/account.html", "utf8");
    const footer = readFileSync("pages/components/site-footer.html", "utf8").trim();
    expect(account).toContain("<!-- SITE_FOOTER_START -->");
    expect(account).toContain(footer);
    expect(account).not.toContain("account-legal-footer");
  });
});
