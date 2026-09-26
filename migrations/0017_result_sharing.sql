PRAGMA foreign_keys = ON;

-- v1.5.33: plan-gated practice result sharing.
-- Plus: text result sharing. Pro: Plus + image cards for results / analytics.
INSERT INTO plan_entitlements(plan_code,feature_key,enabled,limit_value) VALUES
  ('free','result_text_share',0,0),
  ('free','result_image_share',0,0),
  ('team_plus','result_text_share',1,NULL),
  ('team_plus','result_image_share',0,0),
  ('team_pro','result_text_share',1,NULL),
  ('team_pro','result_image_share',1,NULL)
ON CONFLICT(plan_code,feature_key) DO UPDATE SET
  enabled=excluded.enabled,
  limit_value=excluded.limit_value,
  updated_at=CURRENT_TIMESTAMP;

UPDATE plans
SET description='特定チーム限定のチーム運用強化プラン。複数サイングループ、1サイン複数動画、動画プレビュー開始位置、サブ管理者最大5名、練習結果の文章共有を利用できます。',
    updated_at=CURRENT_TIMESTAMP
WHERE code='team_plus';

UPDATE plans
SET description='特定チーム限定の上位プラン。Plusの全機能に加えて、正答率・苦手分析、最近のアクティビティ／監査ログ、成績カード画像共有を利用できます。',
    updated_at=CURRENT_TIMESTAMP
WHERE code='team_pro';
