import { describe, expect, test } from "vitest";
import { readFileSync } from "node:fs";

const admin = readFileSync("client/admin.ts", "utf8");
const team = readFileSync("client/team.ts", "utf8");
const systemHeader = readFileSync("client/components/system-admin-header.ts", "utf8");
const teamAdminHeader = readFileSync("client/components/team-admin-header.ts", "utf8");
const practiceHeader = readFileSync("client/components/practice-header.ts", "utf8");

describe("purpose-specific application headers", () => {
  test("system admin has its own header component", () => {
    expect(admin).toContain('from "./components/system-admin-header"');
    expect(systemHeader).toContain('data-header-component="system-admin"');
  });

  test("team admin has its own header component", () => {
    expect(admin).toContain('from "./components/team-admin-header"');
    expect(teamAdminHeader).toContain('data-header-component="team-admin"');
  });

  test("practice pages have their own header component", () => {
    expect(team).toContain('from "./components/practice-header"');
    expect(practiceHeader).toContain('data-header-component="practice"');
  });
});
