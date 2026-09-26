PRAGMA foreign_keys = ON;

-- Identify the account administrator who performed an audited action when the
-- request was authenticated with Google / LINE. Older audit rows remain valid
-- and simply have a NULL actor_user_id.
ALTER TABLE audit_log ADD COLUMN actor_user_id TEXT;

CREATE INDEX IF NOT EXISTS idx_audit_log_team_recent
ON audit_log(actor_team_id, created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_audit_log_user_login
ON audit_log(actor_user_id, action, created_at DESC, id DESC)
WHERE actor_user_id IS NOT NULL;
