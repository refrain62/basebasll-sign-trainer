import { expect, test, type TestInfo } from "@playwright/test";
import { expectNoBodyOverflow, guardBrowser } from "./helpers.ts";
import {
  E2E_PLAYER_PASSPHRASE,
  E2E_SYSTEM_ADMIN_SECRET,
  E2E_TEAM_ADMIN_PASSWORD,
  localManagementE2E,
  loginSystemAdmin,
  loginTeamAdmin,
  provisionTeam
} from "./management-helpers.ts";

const desktopOnly = (projectName: string) => projectName === "desktop-chromium";
const mobileOnly = (projectName: string) => projectName === "mobile-chromium";


function skipUnlessLocal() {
  test.skip(!localManagementE2E, "管理機能E2Eはデータを変更するため、既定ではPlaywright専用の隔離localhost D1にだけ実行します。");
}

test("system admin can create, edit plan, withdraw and restore a team", async ({ page }, testInfo) => {
  skipUnlessLocal();
  test.skip(!desktopOnly(testInfo.project.name), "破壊的な管理CRUDはdesktop 1系統で十分です");
  const guard = guardBrowser(page);
  await loginSystemAdmin(page);
  await page.goto("/admin/teams");
  await expect(page.getByRole("heading", { name: "チーム管理" })).toBeVisible();

  const suffix = `${testInfo.workerIndex}-${Date.now().toString(36)}`;
  const originalName = `E2Eシステム管理-${suffix}`;
  const renamed = `${originalName}-更新`;

  await page.locator("#create-team-open").click();
  const createForm = page.locator("#create-team-form");
  await createForm.locator('[name="name"]').fill(originalName);
  await createForm.locator('[name="passphrase"]').fill(E2E_PLAYER_PASSPHRASE);
  await createForm.locator('[name="adminPassword"]').fill(E2E_TEAM_ADMIN_PASSWORD);
  await createForm.getByRole("button", { name: "チームを登録する" }).click();
  await expect(page.getByRole("heading", { name: "登録しました" })).toBeVisible();
  await page.locator("#create-finish").click();
  await expect(page.getByText("チームを登録しました。", { exact: true })).toBeVisible();

  const search = page.locator("#system-team-search");
  await search.fill(originalName);
  const card = page.locator("[data-team-id]").filter({ hasText: originalName });
  await expect(card).toBeVisible();
  const teamId = await card.getAttribute("data-team-id");
  expect(teamId).toBeTruthy();

  await card.locator("[data-system-edit]").click();
  const editForm = page.locator("#system-team-edit-form");
  await editForm.locator('[name="name"]').fill(renamed);
  await editForm.locator('[name="planCode"]').selectOption("team_pro");
  await editForm.getByRole("button", { name: "保存する" }).click();
  await expect(page.getByText("チーム設定を保存しました。", { exact: true })).toBeVisible();
  await search.fill(renamed);
  const updatedCard = page.locator(`[data-team-id="${teamId}"]`);
  await expect(updatedCard).toContainText(renamed);
  await expect(updatedCard).toContainText("Pro");

  page.once("dialog", (dialog) => dialog.accept());
  await updatedCard.locator("[data-system-edit]").click();
  await page.locator("#system-team-delete").click();
  await expect(page.getByText(/チームを退会済みにしました/)).toBeVisible();

  await page.locator("#system-team-search").fill(renamed);
  const deletedCard = page.locator(`[data-team-id="${teamId}"]`);
  await expect(deletedCard).toContainText("退会済み");
  page.once("dialog", (dialog) => dialog.accept());
  await deletedCard.locator("[data-system-restore]").click();
  await expect(page.getByText("チームを復活しました。", { exact: true })).toBeVisible();
  await page.locator("#system-team-search").fill(renamed);
  await expect(page.locator(`[data-team-id="${teamId}"]`)).toContainText("利用中");
  await expectNoBodyOverflow(page);
  guard.assertClean();
});

test("system admin can publish and delete a system notice", async ({ page }, testInfo) => {
  skipUnlessLocal();
  test.skip(!desktopOnly(testInfo.project.name), "管理CRUDはdesktop 1系統で十分です");
  const guard = guardBrowser(page);
  await loginSystemAdmin(page);
  await page.goto("/admin/notices");
  await expect(page.getByRole("heading", { name: "システムのお知らせ" })).toBeVisible();

  const title = `E2Eお知らせ-${Date.now().toString(36)}`;
  await page.locator("#create-system-notice").click();
  const form = page.locator("#system-notice-form");
  await form.locator('[name="title"]').fill(title);
  await form.locator('[name="body"]').fill("Playwright管理機能E2Eで作成したテスト用お知らせです。");
  await form.locator('[name="kind"]').selectOption("update");
  await form.locator('[name="status"]').selectOption("published");
  await form.getByRole("button", { name: "お知らせを登録" }).click();
  await expect(page.getByText("お知らせを登録しました。", { exact: true })).toBeVisible();
  await expect(page.getByText(title, { exact: true })).toBeVisible();

  const titleNode = page.getByText(title, { exact: true });
  const noticeContainer = titleNode.locator("xpath=ancestor::*[@data-page-item][1]");
  page.once("dialog", (dialog) => dialog.accept());
  await noticeContainer.locator("[data-system-notice-delete]").click();
  await expect(page.getByText("お知らせを削除しました。", { exact: true })).toBeVisible();
  await expect(page.getByText(title, { exact: true })).toHaveCount(0);

  await page.goto("/admin/security");
  await expect(page.getByRole("heading", { name: "データ保護" })).toBeVisible();
  await expect(page.locator("#data-protection-status")).not.toHaveText("状態を確認しています…");
  await expectNoBodyOverflow(page);
  guard.assertClean();
});

test("team admin session survives every management route", async ({ page, request }, testInfo) => {
  skipUnlessLocal();
  test.skip(!desktopOnly(testInfo.project.name), "全ルート巡回はdesktopで実施します");
  const team = await provisionTeam(request, testInfo, { planCode: "team_pro", namePrefix: "E2Eルート" });
  const guard = guardBrowser(page);
  await loginTeamAdmin(page, team);

  const routes = [
    ["", team.name],
    ["activity", "最近のアクティビティ"],
    ["groups", "サイングループ"],
    ["signs", "サイン管理"],
    ["share", "選手用ページを共有"],
    ["admins", "管理者"],
    ["plan-auth", "プラン・認証"],
    ["notices", "システムのお知らせ"],
    ["settings", "チーム設定"]
  ] as const;

  for (const [suffix, heading] of routes) {
    const path = `/t/${encodeURIComponent(team.id)}/admin${suffix ? `/${suffix}` : ""}`;
    const response = await page.goto(path, { waitUntil: "networkidle" });
    expect(response?.status(), path).toBe(200);
    await expect(page.getByRole("heading", { name: heading }).first()).toBeVisible();
    await expect(page.locator("body")).not.toContainText("読み込めませんでした");
    await expectNoBodyOverflow(page);
  }
  guard.assertClean();
});

test("team admin can manage groups, signs, videos and team settings", async ({ page, request }, testInfo) => {
  skipUnlessLocal();
  test.skip(!desktopOnly(testInfo.project.name), "管理CRUDはdesktop 1系統で十分です");
  const team = await provisionTeam(request, testInfo, { planCode: "team_pro", namePrefix: "E2Eサイン管理" });
  const guard = guardBrowser(page);
  await loginTeamAdmin(page, team);

  const groupName = `E2Eグループ-${Date.now().toString(36)}`;
  const groupRenamed = `${groupName}-更新`;
  await page.goto(`/t/${team.id}/admin/groups`);
  await page.locator("#open-add-group, #open-add-group-empty").first().click();
  let groupForm = page.locator("#group-modal-form");
  await groupForm.locator('[name="name"]').fill(groupName);
  await groupForm.locator('[name="description"]').fill("E2Eで追加したグループ");
  await groupForm.getByRole("button", { name: "追加する" }).click();
  await expect(page.getByText(groupName, { exact: true })).toBeVisible();

  let groupCard = page.locator("[data-group-id]").filter({ hasText: groupName });
  await groupCard.locator("[data-edit-group]").click();
  groupForm = page.locator("#group-modal-form");
  await groupForm.locator('[name="name"]').fill(groupRenamed);
  await groupForm.getByRole("button", { name: "保存する" }).click();
  await expect(page.getByText(groupRenamed, { exact: true })).toBeVisible();
  groupCard = page.locator("[data-group-id]").filter({ hasText: groupRenamed });
  const groupId = await groupCard.getAttribute("data-group-id");
  expect(groupId).toBeTruthy();

  await page.goto(`/t/${team.id}/admin/signs`);
  await page.locator("#open-add-sign").click();
  let signForm = page.locator("#sign-modal-form");
  const signName = `E2Eサイン-${Date.now().toString(36)}`;
  const signRenamed = `${signName}-更新`;
  await signForm.locator('[name="name"]').fill(signName);
  await signForm.locator('[name="groupId"]').selectOption(String(groupId));
  await signForm.locator('[name="youtubeUrl"]').fill("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
  await signForm.locator('[name="videoComment"]').fill("E2E動画メモ");
  await signForm.getByRole("button", { name: "追加する" }).click();
  await expect(page.getByText(signName, { exact: true })).toBeVisible();

  let signCard = page.locator("[data-sign-id]").filter({ hasText: signName });
  await signCard.locator("[data-edit-sign]").click();
  signForm = page.locator("#sign-modal-form");
  await signForm.locator('[name="name"]').fill(signRenamed);
  await signForm.getByRole("button", { name: "保存する" }).click();
  await expect(page.getByText(signRenamed, { exact: true })).toBeVisible();

  signCard = page.locator("[data-sign-id]").filter({ hasText: signRenamed });

  const firstVideo = signCard.locator("[data-video-id]").first();
  await firstVideo.locator("[data-edit-video]").click();
  let videoForm = page.locator("#video-modal-form");
  await videoForm.locator('[name="comment"]').fill("E2E動画メモ更新");
  await videoForm.locator('[name="thumbnailTimeSeconds"]').fill("5");
  await videoForm.getByRole("button", { name: "保存する" }).click();
  await expect(page.getByText("動画を保存しました。", { exact: true })).toBeVisible();
  signCard = page.locator("[data-sign-id]").filter({ hasText: signRenamed });
  await expect(signCard).toContainText("E2E動画メモ更新");
  await expect(signCard).toContainText("5秒から確認");

  await signCard.locator("[data-add-video]").click();
  videoForm = page.locator("#video-modal-form");
  await videoForm.locator('[name="youtubeUrl"]').fill("https://www.youtube.com/watch?v=9bZkp7q19f0");
  await videoForm.locator('[name="comment"]').fill("E2E追加動画");
  await videoForm.getByRole("button", { name: "動画を追加" }).click();
  await expect(page.getByText("動画を追加しました。", { exact: true })).toBeVisible();
  signCard = page.locator("[data-sign-id]").filter({ hasText: signRenamed });
  await expect(signCard.locator("[data-video-id]")).toHaveCount(2);
  const addedVideo = signCard.locator("[data-video-id]").filter({ hasText: "E2E追加動画" });
  await addedVideo.locator("[data-edit-video]").click();
  page.once("dialog", (dialog) => dialog.accept());
  await page.locator("#delete-video-in-modal").click();
  await expect(page.getByText("動画を削除しました。", { exact: true })).toBeVisible();
  signCard = page.locator("[data-sign-id]").filter({ hasText: signRenamed });
  await expect(signCard.locator("[data-video-id]")).toHaveCount(1);

  page.once("dialog", (dialog) => dialog.accept());
  await signCard.locator("[data-edit-sign]").click();
  await page.locator("#delete-sign-in-modal").click();
  await expect(page.getByText(signRenamed, { exact: true })).toHaveCount(0);

  await page.goto(`/t/${team.id}/admin/groups`);
  groupCard = page.locator("[data-group-id]").filter({ hasText: groupRenamed });
  page.once("dialog", (dialog) => dialog.accept());
  await groupCard.locator("[data-edit-group]").click();
  await page.locator("#delete-group-in-modal").click();
  await expect(page.getByText(groupRenamed, { exact: true })).toHaveCount(0);

  const renamedTeam = `${team.name}-設定更新`;
  await page.goto(`/t/${team.id}/admin/settings`);
  await page.locator("#open-team-settings").click();
  const settingsForm = page.locator("#team-settings-modal-form");
  await settingsForm.locator('[name="name"]').fill(renamedTeam);
  await settingsForm.getByRole("button", { name: "保存する" }).click();
  await expect(page.getByText("チーム設定を保存しました。", { exact: true })).toBeVisible();
  await expect(page.locator(".team-admin-settings-summary")).toContainText(renamedTeam);
  await expectNoBodyOverflow(page);
  guard.assertClean();
});

test("mobile system and team admin menus navigate without layout regression", async ({ page, request }, testInfo) => {
  skipUnlessLocal();
  test.skip(!mobileOnly(testInfo.project.name), "mobile navigation regression only");
  const guard = guardBrowser(page);

  await page.goto("/admin");
  await page.locator("#system-secret").fill(E2E_SYSTEM_ADMIN_SECRET);
  await page.getByRole("button", { name: "管理画面に入る" }).click();
  await expect(page.getByRole("heading", { name: "システム管理" })).toBeVisible();
  await page.locator("#system-admin-menu-open").click();
  await expect(page.locator("#system-admin-mobile-menu-screen")).toBeVisible();
  await page.locator('#system-admin-mobile-menu-screen a[href="/admin/teams"]').click();
  await expect(page.getByRole("heading", { name: "チーム管理" })).toBeVisible();
  await expectNoBodyOverflow(page);

  const team = await provisionTeam(request, testInfo, { planCode: "team_pro", namePrefix: "E2Eモバイル" });
  await loginTeamAdmin(page, team);
  await page.locator("#team-admin-menu-open").click();
  await expect(page.locator("#team-admin-mobile-menu-screen")).toBeVisible();
  await page.locator(`#team-admin-mobile-menu-screen a[href="/t/${team.id}/admin/groups"]`).click();
  await expect(page.getByRole("heading", { name: "サイングループ" })).toBeVisible();
  await expectNoBodyOverflow(page);
  guard.assertClean();
});
