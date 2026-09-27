export function createAdminMembershipRepository(db, protector = null) {
  return {
    async find(teamId, userId) {
      return db.prepare("SELECT team_id,user_id,role,created_at,updated_at FROM team_admin_memberships WHERE team_id=? AND user_id=?")
        .bind(teamId, userId).first();
    },

    async hasAny(teamId) {
      return Boolean(await db.prepare("SELECT team_id FROM team_admin_memberships WHERE team_id=? LIMIT 1").bind(teamId).first());
    },

    async countByRole(teamId, role) {
      const row = await db.prepare("SELECT COUNT(*) AS count FROM team_admin_memberships WHERE team_id=? AND role=?").bind(teamId, role).first();
      return Number(row?.count || 0);
    },

    async add({ teamId, userId, role }) {
      return db.prepare(`INSERT INTO team_admin_memberships(team_id,user_id,role) VALUES(?,?,?)
                         ON CONFLICT(team_id,user_id) DO UPDATE SET role=excluded.role,updated_at=CURRENT_TIMESTAMP`)
        .bind(teamId, userId, role).run();
    },

    async listForTeam(teamId) {
      const result = await db.prepare(`
        SELECT m.team_id,m.user_id,m.role,m.created_at,
               u.display_name,u.email,u.avatar_url
        FROM team_admin_memberships m
        JOIN app_users u ON u.id=m.user_id AND u.deleted_at IS NULL AND u.status='active'
        WHERE m.team_id=?
        ORDER BY CASE m.role WHEN 'owner' THEN 0 ELSE 1 END, m.created_at, m.user_id
      `).bind(teamId).all();
      const output = [];
      for (const row of result.results || []) {
        output.push({
          userId: row.user_id,
          role: row.role,
          displayName: protector ? await protector.decrypt(row.display_name, "app_users.display_name") : row.display_name,
          email: protector ? await protector.decrypt(row.email, "app_users.email") || "" : row.email || "",
          avatarUrl: protector ? await protector.decrypt(row.avatar_url, "app_users.avatar_url") || "" : row.avatar_url || "",
          joinedAt: row.created_at
        });
      }
      return output;
    },

    async listForUser(userId) {
      const result = await db.prepare(`
        SELECT m.team_id,m.role,m.created_at,t.name,t.status,t.created_at AS team_created_at
        FROM team_admin_memberships m
        JOIN teams t ON t.id=m.team_id AND t.deleted_at IS NULL
        WHERE m.user_id=?
        ORDER BY CASE m.role WHEN 'owner' THEN 0 ELSE 1 END, t.updated_at DESC, t.id
      `).bind(userId).all();
      const output = [];
      for (const row of result.results || []) {
        output.push({
          teamId: row.team_id,
          teamName: protector ? await protector.decrypt(row.name, "teams.name") : row.name,
          teamStatus: row.status,
          role: row.role,
          joinedAt: row.created_at,
          teamCreatedAt: row.team_created_at
        });
      }
      return output;
    },

    async ownedTeams(userId) {
      const result = await db.prepare(`SELECT t.id,t.name,t.status FROM team_admin_memberships m
        JOIN teams t ON t.id=m.team_id AND t.deleted_at IS NULL
        WHERE m.user_id=? AND m.role='owner' ORDER BY t.created_at,t.id`).bind(userId).all();
      const output = [];
      for (const row of result.results || []) {
        output.push({ ...row, name: protector ? await protector.decrypt(row.name, "teams.name") : row.name });
      }
      return output;
    },

    async remove(teamId, userId) {
      return db.prepare("DELETE FROM team_admin_memberships WHERE team_id=? AND user_id=?").bind(teamId, userId).run();
    },

    async transferOwner({ teamId, currentOwnerUserId, nextOwnerUserId, currentOwnerExit = false }) {
      const statements = [];
      if (currentOwnerExit) {
        statements.push(db.prepare("DELETE FROM team_admin_memberships WHERE team_id=? AND user_id=? AND role='owner'").bind(teamId, currentOwnerUserId));
      } else {
        statements.push(db.prepare("UPDATE team_admin_memberships SET role='admin',updated_at=CURRENT_TIMESTAMP WHERE team_id=? AND user_id=? AND role='owner'").bind(teamId, currentOwnerUserId));
      }
      statements.push(db.prepare(`INSERT INTO team_admin_memberships(team_id,user_id,role) VALUES(?,?,'owner')
        ON CONFLICT(team_id,user_id) DO UPDATE SET role='owner',updated_at=CURRENT_TIMESTAMP`).bind(teamId, nextOwnerUserId));
      return db.batch(statements);
    }
  };
}
