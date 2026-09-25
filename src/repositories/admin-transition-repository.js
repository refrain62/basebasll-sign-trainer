function changed(result) {
  return Number(result?.meta?.changes || 0);
}

export function createAdminTransitionRepository(db) {
  return {

    async claimLegacyTeam({ teamId, userId }) {
      const guard = "NOT EXISTS (SELECT 1 FROM team_admin_memberships WHERE team_id=?)";
      const results = await db.batch([
        db.prepare(`INSERT INTO team_admin_memberships(team_id,user_id,role)
          SELECT ?,?,'owner' WHERE ${guard}`)
          .bind(teamId, userId, teamId),
        db.prepare(`UPDATE teams
          SET admin_password_enabled=0,admin_session_version=admin_session_version+1,updated_at=CURRENT_TIMESTAMP
          WHERE id=? AND deleted_at IS NULL
            AND EXISTS (SELECT 1 FROM team_admin_memberships WHERE team_id=? AND user_id=? AND role='owner')`)
          .bind(teamId, teamId, userId)
      ]);
      return changed(results?.[0]) > 0 && changed(results?.[1]) > 0;
    },
    async acceptAdminInvite({ inviteId, teamId, userId, maxSubAdmins = 5 }) {
      const results = await db.batch([
        db.prepare(`INSERT INTO team_admin_memberships(team_id,user_id,role)
          SELECT ?,?,'admin'
          WHERE EXISTS (SELECT 1 FROM team_admin_invites WHERE id=? AND team_id=? AND status='pending')
            AND (
              EXISTS (SELECT 1 FROM team_admin_memberships WHERE team_id=? AND user_id=?)
              OR (SELECT COUNT(*) FROM team_admin_memberships WHERE team_id=? AND role='admin') < ?
            )
          ON CONFLICT(team_id,user_id) DO UPDATE SET role=CASE WHEN team_admin_memberships.role='owner' THEN 'owner' ELSE 'admin' END,updated_at=CURRENT_TIMESTAMP`)
          .bind(teamId, userId, inviteId, teamId, teamId, userId, teamId, maxSubAdmins),
        db.prepare(`UPDATE team_admin_invites SET status='accepted',accepted_by_user_id=?,accepted_at=CURRENT_TIMESTAMP
          WHERE id=? AND team_id=? AND status='pending'
            AND EXISTS (SELECT 1 FROM team_admin_memberships WHERE team_id=? AND user_id=? AND role IN ('admin','owner'))`)
          .bind(userId, inviteId, teamId, teamId, userId)
      ]);
      return changed(results?.[1]) > 0;
    },

    async acceptTransferInvite({ inviteId, teamId, currentOwnerUserId, nextOwnerUserId, currentOwnerExit, maxSubAdmins = 5 }) {
      const pendingGuard = "EXISTS (SELECT 1 FROM team_admin_invites WHERE id=? AND team_id=? AND status='pending')";
      const statements = [];
      if (currentOwnerExit) {
        statements.push(db.prepare(`DELETE FROM team_admin_memberships
          WHERE team_id=? AND user_id=? AND role='owner' AND ${pendingGuard}`)
          .bind(teamId, currentOwnerUserId, inviteId, teamId));
      } else {
        statements.push(db.prepare(`UPDATE team_admin_memberships SET role='admin',updated_at=CURRENT_TIMESTAMP
          WHERE team_id=? AND user_id=? AND role='owner' AND ${pendingGuard}
            AND (
              EXISTS (SELECT 1 FROM team_admin_memberships WHERE team_id=? AND user_id=? AND role='admin')
              OR (SELECT COUNT(*) FROM team_admin_memberships WHERE team_id=? AND role='admin') < ?
            )`)
          .bind(teamId, currentOwnerUserId, inviteId, teamId, teamId, nextOwnerUserId, teamId, maxSubAdmins));
      }
      statements.push(db.prepare(`INSERT INTO team_admin_memberships(team_id,user_id,role)
        SELECT ?,?,'owner' WHERE ${pendingGuard}
        ON CONFLICT(team_id,user_id) DO UPDATE SET role='owner',updated_at=CURRENT_TIMESTAMP`)
        .bind(teamId, nextOwnerUserId, inviteId, teamId));
      statements.push(db.prepare("UPDATE teams SET admin_password_enabled=0,admin_session_version=admin_session_version+1,updated_at=CURRENT_TIMESTAMP WHERE id=? AND deleted_at IS NULL AND EXISTS (SELECT 1 FROM team_admin_invites WHERE id=? AND team_id=? AND status='pending')")
        .bind(teamId, inviteId, teamId));
      statements.push(db.prepare("UPDATE team_admin_invites SET status='revoked' WHERE team_id=? AND status='pending' AND id<>?")
        .bind(teamId, inviteId));
      statements.push(db.prepare("UPDATE team_admin_invites SET status='accepted',accepted_by_user_id=?,accepted_at=CURRENT_TIMESTAMP WHERE id=? AND team_id=? AND status='pending'")
        .bind(nextOwnerUserId, inviteId, teamId));
      const results = await db.batch(statements);
      return changed(results?.[results.length - 1]) > 0;
    },

    async transferToExisting({ teamId, currentOwnerUserId, nextOwnerUserId, currentOwnerExit }) {
      // Guard the old-owner mutation with the target still being an admin. Without this
      // condition, a concurrent target removal could demote/delete the only owner and
      // then make the promotion a no-op.
      const targetGuard = "EXISTS (SELECT 1 FROM team_admin_memberships WHERE team_id=? AND user_id=? AND role='admin')";
      const statements = [];
      if (currentOwnerExit) {
        statements.push(db.prepare(`DELETE FROM team_admin_memberships
          WHERE team_id=? AND user_id=? AND role='owner' AND ${targetGuard}`)
          .bind(teamId, currentOwnerUserId, teamId, nextOwnerUserId));
      } else {
        statements.push(db.prepare(`UPDATE team_admin_memberships SET role='admin',updated_at=CURRENT_TIMESTAMP
          WHERE team_id=? AND user_id=? AND role='owner' AND ${targetGuard}`)
          .bind(teamId, currentOwnerUserId, teamId, nextOwnerUserId));
      }
      statements.push(db.prepare("UPDATE team_admin_memberships SET role='owner',updated_at=CURRENT_TIMESTAMP WHERE team_id=? AND user_id=? AND role='admin'").bind(teamId, nextOwnerUserId));
      statements.push(db.prepare("UPDATE teams SET admin_password_enabled=0,admin_session_version=admin_session_version+1,updated_at=CURRENT_TIMESTAMP WHERE id=? AND deleted_at IS NULL AND EXISTS (SELECT 1 FROM team_admin_memberships WHERE team_id=? AND user_id=? AND role='owner')")
        .bind(teamId, teamId, nextOwnerUserId));
      statements.push(db.prepare("UPDATE team_admin_invites SET status='revoked' WHERE team_id=? AND status='pending' AND EXISTS (SELECT 1 FROM team_admin_memberships WHERE team_id=? AND user_id=? AND role='owner')")
        .bind(teamId, teamId, nextOwnerUserId));
      const results = await db.batch(statements);
      return changed(results?.[1]) > 0;
    }
  };
}
