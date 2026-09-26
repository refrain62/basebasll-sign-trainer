import { describe, expect, test } from "vitest";
import { readFileSync } from "node:fs";

const adminSource = readFileSync("client/admin.ts", "utf8");
const routeSource = readFileSync("src/routes/system.ts", "utf8");
const repoSource = readFileSync("src/repositories/team-repository.ts", "utf8");
const serviceSource = readFileSync("src/services/system-team-service.ts", "utf8");

describe("recoverable team retirement", () => {
  test("team retirement is a logical delete and keeps related data", () => {
    expect(repoSource).toContain("deleted_at=COALESCE(deleted_at,CURRENT_TIMESTAMP)");
    expect(repoSource).toContain("async restore(teamId)");
    expect(repoSource).toContain("deleted_at=NULL");
    expect(repoSource).not.toContain("DELETE FROM teams");
  });

  test("system admin can filter retired teams and restore them", () => {
    expect(adminSource).toContain('id="system-team-status-filter"');
    expect(adminSource).toContain('value="deleted"');
    expect(adminSource).toContain('data-system-restore=');
    expect(adminSource).toContain("チームを復活");
    expect(routeSource).toContain('/teams/:teamId/restore');
    expect(serviceSource).toContain("team.restore");
  });
});
