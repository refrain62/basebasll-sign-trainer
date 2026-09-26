PRAGMA foreign_keys = ON;

-- v1.5.28: clarify the three product tiers while self-service billing remains disabled.
-- Plus = team operations. Pro = Plus + analytics / audit.
UPDATE plans
SET name='Free',
    description='基本的なサイン登録・1サイングループ・1サイン1動画・クイズ・共有・PWA・Google/LINE認証。メイン管理者1名で利用できます。',
    monthly_price_yen=0, available_for_purchase=0, active=1, sort_order=10, updated_at=CURRENT_TIMESTAMP
WHERE code='free';

UPDATE plans
SET name='Plus',
    description='特定チーム限定のチーム運用強化プラン。複数サイングループ、1サイン複数動画、動画プレビュー開始位置、サブ管理者最大5名を利用できます。',
    monthly_price_yen=NULL, available_for_purchase=0, active=1, sort_order=20, updated_at=CURRENT_TIMESTAMP
WHERE code='team_plus';

UPDATE plans
SET name='Pro',
    description='特定チーム限定の上位プラン。Plusの全機能に加えて、正答率・苦手分析と最近のアクティビティ／監査ログを利用できます。',
    monthly_price_yen=NULL, available_for_purchase=0, active=1, sort_order=30, updated_at=CURRENT_TIMESTAMP
WHERE code='team_pro';

INSERT INTO plan_entitlements(plan_code,feature_key,enabled,limit_value) VALUES
  ('free','multiple_sign_groups',0,1),
  ('free','multiple_sign_videos',0,1),
  ('free','custom_video_thumbnail',0,0),
  ('free','sub_admin_management',0,0),
  ('free','practice_analytics',0,0),
  ('free','activity_log',0,0),

  ('team_plus','multiple_sign_groups',1,NULL),
  ('team_plus','multiple_sign_videos',1,NULL),
  ('team_plus','custom_video_thumbnail',1,NULL),
  ('team_plus','sub_admin_management',1,5),
  ('team_plus','practice_analytics',0,0),
  ('team_plus','activity_log',0,0),

  ('team_pro','multiple_sign_groups',1,NULL),
  ('team_pro','multiple_sign_videos',1,NULL),
  ('team_pro','custom_video_thumbnail',1,NULL),
  ('team_pro','sub_admin_management',1,5),
  ('team_pro','practice_analytics',1,NULL),
  ('team_pro','activity_log',1,NULL)
ON CONFLICT(plan_code,feature_key) DO UPDATE SET
  enabled=excluded.enabled,
  limit_value=excluded.limit_value,
  updated_at=CURRENT_TIMESTAMP;
