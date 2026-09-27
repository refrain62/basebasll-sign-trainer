export function createAdminInviteRepository(db, protector = null) {
  return {
    async create({ id, teamId, createdByUserId, kind, tokenHash, creatorExit, expiresAt }) {
      return db.prepare(`INSERT INTO team_admin_invites(id,team_id,created_by_user_id,kind,token_hash,creator_exit,expires_at)
                         VALUES(?,?,?,?,?,?,?)`)
        .bind(id, teamId, createdByUserId, kind, tokenHash, creatorExit ? 1 : 0, expiresAt).run();
    },

    async findByTokenHash(tokenHash) {
      const row = await db.prepare(`
        SELECT i.*,t.name AS team_name,u.display_name AS creator_name
        FROM team_admin_invites i
        JOIN teams t ON t.id=i.team_id AND t.deleted_at IS NULL
        JOIN app_users u ON u.id=i.created_by_user_id
        WHERE i.token_hash=?
      `).bind(tokenHash).first();
      if (row && protector) {
        row.team_name = await protector.decrypt(row.team_name, "teams.name");
        row.creator_name = await protector.decrypt(row.creator_name, "app_users.display_name");
      }
      return row;
    },

    async listPending(teamId, now) {
      const result = await db.prepare(`
        SELECT i.id,i.kind,i.creator_exit,i.expires_at,i.created_at,u.display_name AS creator_name
        FROM team_admin_invites i
        JOIN app_users u ON u.id=i.created_by_user_id
        WHERE i.team_id=? AND i.status='pending' AND i.expires_at>?
        ORDER BY i.created_at DESC
      `).bind(teamId, now).all();
      const rows = result.results || [];
      if (protector) {
        for (const row of rows) row.creator_name = await protector.decrypt(row.creator_name, "app_users.display_name");
      }
      return rows;
    },

    async markAccepted(inviteId, userId) {
      return db.prepare("UPDATE team_admin_invites SET status='accepted',accepted_by_user_id=?,accepted_at=CURRENT_TIMESTAMP WHERE id=? AND status='pending'")
        .bind(userId, inviteId).run();
    },

    async revoke(inviteId, teamId) {
      return db.prepare("UPDATE team_admin_invites SET status='revoked' WHERE id=? AND team_id=? AND status='pending'").bind(inviteId, teamId).run();
    }
  };
}
