PRAGMA foreign_keys = ON;

ALTER TABLE app_users ADD COLUMN terms_version TEXT;
ALTER TABLE app_users ADD COLUMN privacy_version TEXT;
ALTER TABLE app_users ADD COLUMN legal_accepted_at TEXT;
