import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { buildTeamPwaManifest } from "../../src/controllers/pwa-controller.ts";
import { applyTeamManifestLink, teamManifestUrlForPath } from "../../src/http/pages.ts";

describe("team-specific PWA", () => {
  it("builds a unique manifest that launches the requested team", () => {
    const manifest = buildTeamPwaManifest("6BnWv2K3zo", "サンプルチーム");
    expect(manifest).toMatchObject({
      id: "/pwa/team/6BnWv2K3zo",
      name: "サンプルチーム",
      short_name: "サンプルチーム",
      start_url: "/t/6BnWv2K3zo?source=pwa",
      scope: "/t/6BnWv2K3zo",
      display: "standalone"
    });
  });

  it("injects the team manifest URL into team pages", () => {
    expect(teamManifestUrlForPath("/t/6BnWv2K3zo")).toBe("/pwa/team/6BnWv2K3zo/manifest.webmanifest");
    expect(teamManifestUrlForPath("/plans")).toBe("");
    expect(applyTeamManifestLink('<head><link rel="manifest" href="/manifest.webmanifest" /></head>', "/t/6BnWv2K3zo"))
      .toContain('href="/pwa/team/6BnWv2K3zo/manifest.webmanifest"');
  });

  it("keeps team install and team-admin entry points in the player UI", () => {
    const teamSource = readFileSync("client/team.ts", "utf8");
    const headerSource = readFileSync("client/components/practice-header.ts", "utf8");
    expect(teamSource).toContain('navigator.serviceWorker.register("/sw.js", { scope: "/" })');
    expect(teamSource).toContain("このチームをホーム画面に追加");
    expect(teamSource).toContain("SIGN TRAINER本体ではなく");
    expect(teamSource).toContain("複数チームに所属していても");
    expect(teamSource).toContain("チーム管理者ログイン");
    expect(teamSource).toContain("activeTeamAdminPath()");
    expect(headerSource).toContain("ホーム画面に追加");
    expect(headerSource).toContain("チーム管理者ログイン");
  });
});
