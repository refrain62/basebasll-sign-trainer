-- Allow each administrator to use a team-specific display name while keeping the account-level name as a fallback.
ALTER TABLE team_admin_memberships ADD COLUMN display_name TEXT;
