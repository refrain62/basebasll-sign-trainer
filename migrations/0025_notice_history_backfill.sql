-- Backfill major user-facing updates that predate the release-notice governance rule.
-- Keep this migration immutable after deployment. Each insert is idempotent so a
-- manually re-run SQL file will not duplicate the historical notice.

INSERT INTO system_notices(title, body, kind, status, publish_at, expires_at, updated_at)
SELECT
  'サイングループで練習を整理できるようになりました',
  'サインをバッティング・守備・走塁などのグループに分け、説明文や説明動画を付けて練習前に確認できるようになりました。選手は練習するグループを選んでからクイズを始められます。',
  'update', 'published', '2026-09-24 00:00:00', NULL, CURRENT_TIMESTAMP
WHERE NOT EXISTS (
  SELECT 1 FROM system_notices
  WHERE title = 'サイングループで練習を整理できるようになりました'
    AND publish_at = '2026-09-24 00:00:00'
);

INSERT INTO system_notices(title, body, kind, status, publish_at, expires_at, updated_at)
SELECT
  'Google / LINEでチーム管理できるようになりました',
  'チーム管理者はGoogleまたはLINEで本人確認して管理できるようになりました。メイン管理者とサブ管理者を分け、招待リンクで管理者を追加できます。既存チームも旧管理者パスワードから管理者アカウントへ移行できます。',
  'update', 'published', '2026-09-25 00:00:00', NULL, CURRENT_TIMESTAMP
WHERE NOT EXISTS (
  SELECT 1 FROM system_notices
  WHERE title = 'Google / LINEでチーム管理できるようになりました'
    AND publish_at = '2026-09-25 00:00:00'
);

INSERT INTO system_notices(title, body, kind, status, publish_at, expires_at, updated_at)
SELECT
  'Free / Plus / Proの機能を整理しました',
  'Free / Plus / Proの3プランに整理しました。Plusでは複数グループ・複数動画・サブ管理者・練習結果の文章共有、Proでは詳細分析・最近のアクティビティ・画像カード共有などを利用できます。Plus / Proは現在、対象チームへの限定提供です。',
  'update', 'published', '2026-09-26 00:00:00', NULL, CURRENT_TIMESTAMP
WHERE NOT EXISTS (
  SELECT 1 FROM system_notices
  WHERE title = 'Free / Plus / Proの機能を整理しました'
    AND publish_at = '2026-09-26 00:00:00'
);

INSERT INTO system_notices(title, body, kind, status, publish_at, expires_at, updated_at)
SELECT
  'チーム管理画面を使いやすく整理しました',
  'チーム管理をダッシュボード、サイングループ、サイン、共有、管理者、プラン・認証、お知らせ、設定に分けました。スマホでは右上のメニューから目的の画面へ直接移動できます。',
  'update', 'published', '2026-09-26 06:00:00', NULL, CURRENT_TIMESTAMP
WHERE NOT EXISTS (
  SELECT 1 FROM system_notices
  WHERE title = 'チーム管理画面を使いやすく整理しました'
    AND publish_at = '2026-09-26 06:00:00'
);

INSERT INTO system_notices(title, body, kind, status, publish_at, expires_at, updated_at)
SELECT
  '管理者名とメールアドレスの表示を見直しました',
  'Google / LINEでログインしたあとに管理者名を確認・変更できるようにしました。管理者一覧では自分のメールアドレスだけを表示し、ほかの管理者のメールアドレスは表示しません。',
  'update', 'published', '2026-09-30 00:00:00', NULL, CURRENT_TIMESTAMP
WHERE NOT EXISTS (
  SELECT 1 FROM system_notices
  WHERE title = '管理者名とメールアドレスの表示を見直しました'
    AND publish_at = '2026-09-30 00:00:00'
);

INSERT INTO system_notices(title, body, kind, status, publish_at, expires_at, updated_at)
SELECT
  'チームごとに管理者名を設定できるようになりました',
  '同じ管理者アカウントでも、チームごとに「太郎 父」「花子 父」のような名前を設定できるようになりました。マイアカウントまたは各チームの管理画面から変更できます。兄弟が同じチームの場合は連名にもできます。',
  'update', 'published', '2026-10-01 00:00:00', NULL, CURRENT_TIMESTAMP
WHERE NOT EXISTS (
  SELECT 1 FROM system_notices
  WHERE title = 'チームごとに管理者名を設定できるようになりました'
    AND publish_at = '2026-10-01 00:00:00'
);
