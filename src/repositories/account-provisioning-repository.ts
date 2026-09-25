export function createAccountProvisioningRepository(db, protector = null) {
  return {
    async createOwnedTeam({ teamId, name, passphraseHash, adminHash, userId }) {
      const protectedName = protector ? await protector.encrypt(name, "teams.name") : name;
      return db.batch([
        db.prepare("INSERT INTO teams(id,name,passphrase_hash,admin_password_hash,admin_password_enabled,status) VALUES(?,?,?,?,0,'active')")
          .bind(teamId, protectedName, passphraseHash, adminHash),
        db.prepare("INSERT INTO team_admin_memberships(team_id,user_id,role) VALUES(?,?,'owner')")
          .bind(teamId, userId)
      ]);
    }
  };
}
