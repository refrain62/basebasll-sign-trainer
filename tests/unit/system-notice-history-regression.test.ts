import { describe, expect, test } from "vitest";
import { readFileSync } from "node:fs";

const read = (file: string) => readFileSync(file, "utf8");

describe("historical SYSTEM notices", () => {
  test("backfills only the curated major user-facing updates", () => {
    const sql = read("migrations/0025_notice_history_backfill.sql");
    const titles = [
      "サイングループで練習を整理できるようになりました",
      "Google / LINEでチーム管理できるようになりました",
      "Free / Plus / Proの機能を整理しました",
      "チーム管理画面を使いやすく整理しました",
      "管理者名とメールアドレスの表示を見直しました",
      "チームごとに管理者名を設定できるようになりました"
    ];
    for (const title of titles) expect(sql).toContain(title);
    expect(sql.match(/INSERT INTO system_notices/g)?.length).toBe(titles.length);
    expect(sql.match(/WHERE NOT EXISTS/g)?.length).toBe(titles.length);
    expect(sql).not.toContain("admin.display_name.update");
  });

  test("keeps a purpose-specific catalog and historical publish-date support", () => {
    expect(read("docs/product/system-notices.md")).toContain("過去分として整備するお知らせ");
    expect(read("docs/INDEX.md")).toContain("product/system-notices.md");
    const generator = read("scripts/create-system-notice-migration.ts");
    expect(generator).toContain('arg("publish-at")');
    expect(generator).toContain("Date.parse(publishAt)");
  });
});
