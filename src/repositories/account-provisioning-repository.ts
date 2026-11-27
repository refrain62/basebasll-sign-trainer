export function createAccountProvisioningRepository(db, protector = null) {
  return {
    async createOwnedTeam({ teamId, name, passphraseHash, adminHash, userId, maxOwnedTeams = 3 }) {
      const protectedName = protector ? await protector.encrypt(name, "teams.name") : name;
      return db.batch([
        db.prepare(`INSERT INTO teams(id,name,passphrase_hash,admin_password_hash,admin_password_enabled,status)
          SELECT ?,?,?,?,0,'active'
          WHERE (SELECT COUNT(*) FROM team_admin_memberships m
            JOIN teams t ON t.id=m.team_id AND t.deleted_at IS NULL
            WHERE m.user_id=? AND m.role='owner') < ?`)
          .bind(teamId, protectedName, passphraseHash, adminHash, userId, maxOwnedTeams),
        db.prepare(`INSERT INTO team_admin_memberships(team_id,user_id,role)
          SELECT ?,?,'owner' WHERE changes() = 1 AND EXISTS (SELECT 1 FROM teams WHERE id=?)`)
          .bind(teamId, userId, teamId)
      ]);
    }
  };
}
