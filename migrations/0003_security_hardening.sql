PRAGMA foreign_keys = ON;

ALTER TABLE teams ADD COLUMN player_session_version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE teams ADD COLUMN admin_session_version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE teams ADD COLUMN deleted_at TEXT;
ALTER TABLE signs ADD COLUMN deleted_at TEXT;
ALTER TABLE sign_videos ADD COLUMN deleted_at TEXT;

CREATE TABLE IF NOT EXISTS auth_rate_limits (
  key TEXT PRIMARY KEY,
  window_start INTEGER NOT NULL,
  count INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  actor_role TEXT NOT NULL,
  actor_team_id TEXT,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT,
  detail_json TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_team ON audit_log(actor_team_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_teams_deleted_at ON teams(deleted_at);
CREATE INDEX IF NOT EXISTS idx_signs_deleted_at ON signs(team_id, deleted_at);
CREATE INDEX IF NOT EXISTS idx_sign_videos_deleted_at ON sign_videos(sign_id, deleted_at);
