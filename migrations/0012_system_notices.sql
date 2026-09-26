PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS system_notices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  kind TEXT NOT NULL DEFAULT 'info' CHECK(kind IN ('info','update','maintenance','important')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','published')),
  publish_at TEXT,
  expires_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_system_notices_status_publish
  ON system_notices(status, publish_at DESC, created_at DESC);
