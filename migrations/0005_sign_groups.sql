PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS sign_groups (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  team_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  explanation_youtube_url TEXT NOT NULL DEFAULT '',
  explanation_youtube_video_id TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  enabled INTEGER NOT NULL DEFAULT 1 CHECK (enabled IN (0,1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TEXT,
  FOREIGN KEY(team_id) REFERENCES teams(id) ON DELETE CASCADE
);

ALTER TABLE signs ADD COLUMN group_id INTEGER REFERENCES sign_groups(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_sign_groups_team_order ON sign_groups(team_id, sort_order, id);
CREATE INDEX IF NOT EXISTS idx_signs_group ON signs(group_id, sort_order, id);
