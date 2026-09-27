PRAGMA foreign_keys = ON;

-- Paid functionality is currently provisioned manually by SYSTEM administrators.
-- There is intentionally no self-service signup or billing path yet.
UPDATE plans
SET available_for_purchase=0,
    updated_at=CURRENT_TIMESTAMP
WHERE code IN ('free','team_plus','team_pro');

UPDATE plans
SET description='基本的なサイン登録・YouTube動画・クイズ・共有・PWA・Google/LINE認証。規定の1サイングループとメイン管理者1名で利用できます。',
    updated_at=CURRENT_TIMESTAMP
WHERE code='free';

UPDATE plans
SET name='Team Plus',
    description='特定チーム限定で提供中。複数サイングループ、サブ管理者、監査ログ、練習分析などの高度な運用機能。',
    monthly_price_yen=NULL,
    updated_at=CURRENT_TIMESTAMP
WHERE code='team_plus';

UPDATE plans
SET name='Team Pro',
    description='特定チーム限定で提供中。Team Plusの運用機能に加えて将来の大容量機能向け。',
    monthly_price_yen=NULL,
    updated_at=CURRENT_TIMESTAMP
WHERE code='team_pro';

INSERT INTO plan_entitlements(plan_code,feature_key,enabled,limit_value) VALUES
  ('free','multiple_sign_groups',0,1),
  ('free','sub_admin_management',0,0),
  ('free','activity_log',0,0),
  ('free','practice_analytics',0,0),
  ('team_plus','multiple_sign_groups',1,NULL),
  ('team_plus','sub_admin_management',1,5),
  ('team_plus','activity_log',1,NULL),
  ('team_plus','practice_analytics',1,NULL),
  ('team_pro','multiple_sign_groups',1,NULL),
  ('team_pro','sub_admin_management',1,5),
  ('team_pro','activity_log',1,NULL),
  ('team_pro','practice_analytics',1,NULL)
ON CONFLICT(plan_code,feature_key) DO UPDATE SET
  enabled=excluded.enabled,
  limit_value=excluded.limit_value,
  updated_at=CURRENT_TIMESTAMP;
