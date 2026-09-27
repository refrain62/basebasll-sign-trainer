PRAGMA foreign_keys = ON;

-- v1.5.37 fix30: refresh plan limits for history messaging and sub-admin capacity.
UPDATE plans
SET description='特定チーム限定の上位プラン。Plusの全機能に加えて、正答率・苦手分析と最近のアクティビティ／監査ログを利用できます。サブ管理者は最大10名まで追加できます。',
    updated_at=CURRENT_TIMESTAMP
WHERE code='team_pro';

INSERT INTO plan_entitlements(plan_code,feature_key,enabled,limit_value) VALUES
  ('team_pro','sub_admin_management',1,10)
ON CONFLICT(plan_code,feature_key) DO UPDATE SET
  enabled=excluded.enabled,
  limit_value=excluded.limit_value,
  updated_at=CURRENT_TIMESTAMP;
