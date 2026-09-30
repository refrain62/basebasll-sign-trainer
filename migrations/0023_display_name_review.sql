-- Track whether the administrator has explicitly reviewed the team-facing handle name.
-- Existing accounts intentionally start unreviewed so they receive the one-time prompt.
ALTER TABLE app_users ADD COLUMN display_name_reviewed_at TEXT;
