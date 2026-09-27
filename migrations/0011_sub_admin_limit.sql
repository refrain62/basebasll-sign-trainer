PRAGMA foreign_keys = ON;

-- One main administrator (owner) already has a unique partial index.
-- This trigger adds a final D1-side guard so direct INSERT paths cannot exceed five sub administrators.
CREATE TRIGGER IF NOT EXISTS trg_team_admin_max_five_insert
BEFORE INSERT ON team_admin_memberships
WHEN NEW.role = 'admin'
  AND NOT EXISTS (
    SELECT 1 FROM team_admin_memberships
    WHERE team_id = NEW.team_id AND user_id = NEW.user_id
  )
  AND (
    SELECT COUNT(*) FROM team_admin_memberships
    WHERE team_id = NEW.team_id AND role = 'admin'
  ) >= 5
BEGIN
  SELECT RAISE(ABORT, 'sub_admin_limit_reached');
END;
