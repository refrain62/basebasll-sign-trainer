PRAGMA foreign_keys = ON;

ALTER TABLE teams ADD COLUMN admin_password_enabled INTEGER NOT NULL DEFAULT 1 CHECK (admin_password_enabled IN (0,1));

CREATE TABLE IF NOT EXISTS app_users (
  id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  email TEXT,
  avatar_url TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','deleted')),
  session_version INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TEXT
);

CREATE TABLE IF NOT EXISTS user_identities (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  provider TEXT NOT NULL CHECK (provider IN ('google','line')),
  provider_subject TEXT NOT NULL,
  provider_email TEXT,
  email_verified INTEGER NOT NULL DEFAULT 0 CHECK (email_verified IN (0,1)),
  display_name TEXT,
  avatar_url TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(user_id) REFERENCES app_users(id) ON DELETE CASCADE,
  UNIQUE(provider, provider_subject)
);

CREATE TABLE IF NOT EXISTS team_admin_memberships (
  team_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('owner','admin')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(team_id, user_id),
  FOREIGN KEY(team_id) REFERENCES teams(id) ON DELETE CASCADE,
  FOREIGN KEY(user_id) REFERENCES app_users(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_team_admin_one_owner
ON team_admin_memberships(team_id)
WHERE role='owner';

CREATE INDEX IF NOT EXISTS idx_user_identities_user
ON user_identities(user_id, provider);

CREATE INDEX IF NOT EXISTS idx_team_admin_user
ON team_admin_memberships(user_id, role, team_id);

CREATE TABLE IF NOT EXISTS team_admin_invites (
  id TEXT PRIMARY KEY,
  team_id TEXT NOT NULL,
  created_by_user_id TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('admin','transfer')),
  token_hash TEXT NOT NULL UNIQUE,
  creator_exit INTEGER NOT NULL DEFAULT 0 CHECK (creator_exit IN (0,1)),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','revoked','expired')),
  expires_at INTEGER NOT NULL,
  accepted_by_user_id TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  accepted_at TEXT,
  FOREIGN KEY(team_id) REFERENCES teams(id) ON DELETE CASCADE,
  FOREIGN KEY(created_by_user_id) REFERENCES app_users(id) ON DELETE CASCADE,
  FOREIGN KEY(accepted_by_user_id) REFERENCES app_users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_team_admin_invites_team
ON team_admin_invites(team_id, status, expires_at);
