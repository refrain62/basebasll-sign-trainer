PRAGMA foreign_keys = ON;

-- Existing provider_subject values are plaintext from older builds. New code stores
-- a keyed HMAC in provider_subject for lookup and keeps the encrypted original here.
-- Existing rows are upgraded by the system-admin protection maintenance action.
ALTER TABLE user_identities ADD COLUMN provider_subject_ciphertext TEXT;

-- Existing audit rows may contain legacy free-text details. The maintenance action
-- rewrites them through the audit redactor and marks completion here.
ALTER TABLE audit_log ADD COLUMN protected_at TEXT;

CREATE INDEX IF NOT EXISTS idx_user_identities_subject_ciphertext
ON user_identities(provider, provider_subject_ciphertext)
WHERE provider_subject_ciphertext IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_audit_log_unprotected
ON audit_log(protected_at)
WHERE detail_json IS NOT NULL;
