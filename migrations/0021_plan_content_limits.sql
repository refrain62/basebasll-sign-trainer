PRAGMA foreign_keys = ON;

-- v1.5.37: content limits aligned with the public plan table.
INSERT INTO plan_entitlements(plan_code,feature_key,enabled,limit_value) VALUES
  ('free','multiple_sign_groups',0,1),
  ('free','sign_count',1,10),
  ('team_plus','multiple_sign_groups',1,3),
  ('team_plus','sign_count',1,20),
  ('team_pro','multiple_sign_groups',1,NULL),
  ('team_pro','sign_count',1,NULL)
ON CONFLICT(plan_code,feature_key) DO UPDATE SET
  enabled=excluded.enabled,
  limit_value=excluded.limit_value,
  updated_at=CURRENT_TIMESTAMP;

UPDATE plans SET description='サイン最大10個・1サイングループ・1サイン1動画・クイズ・共有・ホーム画面への追加・Google/LINE認証。メイン管理者1名で利用できます。', updated_at=CURRENT_TIMESTAMP WHERE code='free';
UPDATE plans SET description='特定チーム限定のチーム運用強化プラン。サイン最大20個・サイングループ最大3つ・1サイン複数動画・動画プレビュー開始位置・サブ管理者最大5名を利用できます。', updated_at=CURRENT_TIMESTAMP WHERE code='team_plus';

UPDATE plans SET description='特定チーム限定の上位プラン。サイン登録・サイングループは無制限。Plusの全機能に加えて、正答率・苦手分析と最近のアクティビティ／監査ログを利用できます。', updated_at=CURRENT_TIMESTAMP WHERE code='team_pro';
