import { describe, expect, test } from "vitest";
import { readFileSync } from "node:fs";

describe("OAuth provider branding", () => {
  const account = readFileSync("client/account.ts", "utf8");
  const admin = readFileSync("client/admin.ts", "utf8");
  const lp = readFileSync("pages/index.html", "utf8");
  const css = readFileSync("public/styles.css", "utf8");

  test("uses the standard-color Google G on white authentication buttons", () => {
    expect(account).toContain("/assets/google-g-logo.svg");
    expect(admin).toContain("/assets/google-g-logo.svg");
    expect(css).toContain("border: 1px solid #747775");
    expect(css).toContain("color: #1f1f1f");
  });

  test("uses a white LINE login mark on LINE-green authentication buttons", () => {
    expect(account).toContain("/assets/line-login-mark.svg");
    expect(admin).toContain("/assets/line-login-mark.svg");
    expect(lp).toContain("/assets/line-login-mark.svg?v=__ASSET_VERSION__");
    expect(css).toContain("background: #06C755");
    expect(css).toContain("url('/assets/line-login-mark.svg')");
  });
});
