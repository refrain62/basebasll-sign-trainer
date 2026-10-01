import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const adminSource = readFileSync("client/admin.ts", "utf8");

describe("team activity localization", () => {
  it("shows human-readable Japanese labels for current audit actions", () => {
    const expected: Record<string, string> = {
      "auth.success": "共有管理者パスワードでログイン",
      "auth.account.success": "管理者アカウントでログイン",
      "team.create": "チームを作成",
      "team.self_register": "チームを作成",
      "team.update": "チーム設定を変更",
      "group.create": "サイングループを追加",
      "group.update": "サイングループを編集",
      "group.soft_delete": "サイングループを削除",
      "sign.create": "サインを追加",
      "sign.update": "サインを編集",
      "sign.soft_delete": "サインを削除",
      "video.create": "サイン動画を追加",
      "video.update": "サイン動画を編集",
      "video.soft_delete": "サイン動画を削除",
      "admin.display_name.update": "このチームでの管理者名を変更",
      "account.create": "管理者アカウントを作成",
      "account.display_name.update": "基本の管理者名を変更",
      "account.delete": "管理者アカウントを削除",
      "admin.invite.create": "サブ管理者を招待",
      "admin.invite.revoke": "サブ管理者の招待を取り消し",
      "admin.invite.accept": "サブ管理者として参加",
      "admin.remove": "サブ管理者を解除",
      "admin.leave": "チーム管理者から退会",
      "owner.transfer": "メイン管理者の交代を開始",
      "owner.transfer.accept": "メイン管理者の交代を完了",
      "legacy_admin_password.disable": "旧管理者パスワードを無効化",
      "team.claim": "管理者アカウントへ移行",
      "team.withdraw": "チームを退会",
      "team.restore": "退会済みチームを復活",
      "plan.change": "チームプランを変更"
    };
    for (const [action, label] of Object.entries(expected)) {
      expect(adminSource).toContain(`"${action}": "${label}"`);
    }
  });

  it("never falls back to showing an untranslated audit action key", () => {
    expect(adminSource).toContain('return "管理設定を変更";');
    expect(adminSource).not.toContain('return labels[item?.action] || String(item?.action');
    expect(adminSource).toContain('"admin.display_name.update": "このチームでの管理者名を変更"');
  });

  it("localizes non-content audit target types too", () => {
    expect(adminSource).toContain('targetType === "admin-invite") return "管理者招待"');
    expect(adminSource).toContain('targetType === "system_notice") return "運営からのお知らせ"');
    expect(adminSource).toContain('targetType === "system") return "システム設定"');
  });
});
