-- User-facing release notice. Keep this migration immutable after deployment.
INSERT INTO system_notices(
  title, body, kind, status, publish_at, expires_at, updated_at
) VALUES (
  '利用停止中のチームの管理操作を制限しました',
  'システム管理者がチームを利用停止または退会済みにした場合、管理者の招待や設定変更などの操作ができなくなります。チームの利用再開についてはシステム管理者へご相談ください。',
  'update',
  'published',
  CURRENT_TIMESTAMP,
  NULL,
  CURRENT_TIMESTAMP
);
