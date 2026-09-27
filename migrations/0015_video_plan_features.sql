PRAGMA foreign_keys = ON;

ALTER TABLE sign_videos ADD COLUMN thumbnail_time_seconds INTEGER NOT NULL DEFAULT 0;

INSERT INTO plan_entitlements(plan_code,feature_key,enabled,limit_value) VALUES
  ('free','multiple_sign_videos',0,1),
  ('free','custom_video_thumbnail',0,0),
  ('team_plus','multiple_sign_videos',1,NULL),
  ('team_plus','custom_video_thumbnail',1,NULL),
  ('team_pro','multiple_sign_videos',1,NULL),
  ('team_pro','custom_video_thumbnail',1,NULL)
ON CONFLICT(plan_code,feature_key) DO UPDATE SET
  enabled=excluded.enabled,
  limit_value=excluded.limit_value,
  updated_at=CURRENT_TIMESTAMP;

UPDATE plans
SET description='基本的なサイン登録・1サイン1動画・クイズ・共有・PWA・Google/LINE認証。規定の1サイングループとメイン管理者1名で利用できます。',
    updated_at=CURRENT_TIMESTAMP
WHERE code='free';

UPDATE plans
SET description='特定チーム限定で提供中。複数サイングループ、1サイン複数動画、動画プレビュー開始位置の秒数指定、サブ管理者、監査ログ、練習分析などの高度な運用機能。',
    updated_at=CURRENT_TIMESTAMP
WHERE code='team_plus';
