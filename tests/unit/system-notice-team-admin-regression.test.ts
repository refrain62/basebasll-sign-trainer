import { describe, expect, test } from "vitest";
import { readFileSync } from "node:fs";

const adminSource = readFileSync("client/admin.ts", "utf8");
const styles = readFileSync("public/styles.css", "utf8");
const teamAdminSource = adminSource.split("// ---------------- Team admin ----------------")[1] || "";

describe("system notices in team admin regression", () => {
  test("published system notices are fetched for both login and authenticated team admin", () => {
    expect(teamAdminSource).toContain('requestJson("/api/public/notices")');
    expect(teamAdminSource).toContain("const publishedSystemNotices = (await fetchPublishedSystemNotices())");
    expect(teamAdminSource).toContain("const notices = [...contextualNotices, ...publishedSystemNotices];");
  });

  test("fixed notices remain first and important or maintenance system notices are prioritized next", () => {
    expect(teamAdminSource).toContain("const kindPriority = { important: 0, maintenance: 1 }");
    expect(teamAdminSource).toContain(".sort((a, b) => (kindPriority[a.kind] ?? 2) - (kindPriority[b.kind] ?? 2))");
    expect(teamAdminSource).toContain("const notices = [...contextualNotices, ...publishedSystemNotices];");
  });

  test("centrally managed release announcements are no longer duplicated as hard-coded team notices", () => {
    expect(teamAdminSource).not.toContain('id: "admin-navigation-20260926"');
  });

  test("new notices default to published while draft remains an explicit choice", () => {
    expect(adminSource).toContain('value="published" ${!item || item?.status === "published" ? "selected" : ""}>公開');
    expect(adminSource).toContain("「下書き」はチーム管理側のお知らせには表示されません");
  });

  test("system notice kinds have visible team-admin accents", () => {
    expect(styles).toContain(".team-admin-notice-item--important::before");
    expect(styles).toContain(".team-admin-notice-item--maintenance::before");
  });
});
