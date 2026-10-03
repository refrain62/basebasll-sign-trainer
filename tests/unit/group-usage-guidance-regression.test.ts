import { describe, expect, test } from "vitest";
import { readFileSync } from "node:fs";

const read = (file: string) => readFileSync(file, "utf8");

describe("optional movement-training usage guidance", () => {
  test("explains that sign groups can also organize defensive movement and coordination", () => {
    expect(read("pages/index.html")).toContain("二塁手のカバーや中継、バント守備");
    expect(read("pages/support.html")).toContain("サイン以外の「動き方」の確認にも使えますか？");
    expect(read("pages/install.html")).toContain("守備連携やポジションごとの動き方");
  });

  test("shows a short LP how-to for defensive movement training", () => {
    const lp = read("pages/index.html");
    expect(lp).toContain("サインだけじゃない。");
    expect(lp).toContain("グループを作る");
    expect(lp).toContain("動きを動画で登録");
    expect(lp).toContain("クイズで反復する");
    expect(lp).toContain("この場面、二塁手は？");
    expect(lp).toContain("サイン練習が主な用途です");
  });

  test("offers defensive movement as a group creation example without redefining the core product", () => {
    const admin = read("client/admin.ts");
    expect(admin).toContain('data-group-example-name="守備の動き・連携"');
    expect(admin).toContain("二塁の動き・中継・カバーなど");
    expect(admin).toContain("SIGN TRAINERはサイン練習が中心ですが");
  });
});
