import { expect, type APIRequestContext, type Page, type TestInfo } from "@playwright/test";
import { baseOrigin, baseURL } from "./helpers.ts";

export const E2E_SYSTEM_ADMIN_SECRET = "E2ESystemAdmin12345";
export const E2E_TEAM_ADMIN_PASSWORD = "E2ETeamAdmin12345";
export const E2E_PLAYER_PASSPHRASE = "E2Eホームラン";

export const localManagementE2E = !process.env.PLAYWRIGHT_BASE_URL && ["localhost", "127.0.0.1", "::1"].includes(new URL(baseURL).hostname);

const mutationHeaders = {
  origin: baseOrigin,
  "content-type": "application/json"
};

function uniqueSuffix(testInfo: TestInfo): string {
  const project = testInfo.project.name.replace(/[^a-z0-9]+/gi, "-").slice(0, 18);
  return `${project}-${testInfo.workerIndex}-${testInfo.retry}-${Date.now().toString(36)}`;
}

export async function authenticateSystemApi(request: APIRequestContext): Promise<void> {
  const response = await request.post(`${baseURL}/api/system/auth`, {
    headers: mutationHeaders,
    data: { secret: E2E_SYSTEM_ADMIN_SECRET }
  });
  expect(response.status()).toBe(200);
}

export async function provisionTeam(
  request: APIRequestContext,
  testInfo: TestInfo,
  { planCode = "team_pro", namePrefix = "E2E管理テスト" }: { planCode?: "free" | "team_plus" | "team_pro"; namePrefix?: string } = {}
): Promise<{ id: string; name: string; password: string; passphrase: string }> {
  await authenticateSystemApi(request);
  const name = `${namePrefix}-${uniqueSuffix(testInfo)}`;
  const create = await request.post(`${baseURL}/api/system/teams`, {
    headers: mutationHeaders,
    data: { name, passphrase: E2E_PLAYER_PASSPHRASE, adminPassword: E2E_TEAM_ADMIN_PASSWORD }
  });
  expect(create.status()).toBe(201);
  const body = await create.json() as { team?: { id?: string; name?: string } };
  const id = String(body.team?.id || "");
  expect(id).toMatch(/^[A-Za-z0-9_-]{4,40}$/);

  if (planCode !== "free") {
    const update = await request.put(`${baseURL}/api/system/teams/${encodeURIComponent(id)}`, {
      headers: mutationHeaders,
      data: { planCode }
    });
    expect(update.status()).toBe(200);
  }

  return { id, name, password: E2E_TEAM_ADMIN_PASSWORD, passphrase: E2E_PLAYER_PASSPHRASE };
}

export async function loginSystemAdmin(page: Page): Promise<void> {
  await page.goto("/admin");
  await expect(page.getByRole("heading", { name: "システム管理" })).toBeVisible();
  await page.locator("#system-secret").fill(E2E_SYSTEM_ADMIN_SECRET);
  await page.getByRole("button", { name: "管理画面に入る" }).click();
  await expect(page.locator(".admin-loading")).toHaveCount(0);
  await expect(page.locator('aside[aria-label="システム管理メニュー"]')).toBeAttached();
}

export async function loginTeamAdmin(page: Page, team: { id: string; password: string; name: string }): Promise<void> {
  await page.goto(`/t/${encodeURIComponent(team.id)}/admin`);
  await expect(page.getByRole("heading", { name: "管理者のみなさん、こんにちは" })).toBeVisible();
  await expect(page.locator(".team-admin-login-team-name")).toHaveText(team.name);
  await page.locator("#team-admin-password").fill(team.password);
  await page.getByRole("button", { name: "管理者パスワードで入る" }).click();
  await expect(page.locator(".admin-loading")).toHaveCount(0);
  await expect(page.getByRole("heading", { name: team.name })).toBeVisible();
}
