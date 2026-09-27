import { sanitizeAuditDetail } from "../security/audit-detail.ts";

export { sanitizeAuditDetail } from "../security/audit-detail.ts";

function parseDetail(value) {
  if (!value) return null;
  try { return JSON.parse(String(value)); }
  catch { return null; }
}

function publicAuditRow(row) {
  if (!row) return null;
  return {
    id: Number(row.id),
    actorRole: String(row.actor_role || ""),
    actorTeamId: row.actor_team_id || null,
    actorUserId: row.actor_user_id || null,
    action: String(row.action || ""),
    targetType: String(row.target_type || ""),
    targetId: row.target_id == null ? null : String(row.target_id),
    detail: parseDetail(row.detail_json),
    createdAt: row.created_at
  };
}

export function createAuditRepository(db) {
  return {
    async record(actorRole, actorTeamId, action, targetType, targetId, detail = null, actorUserId = null) {
      try {
        const safeDetail = sanitizeAuditDetail(detail);
        await db.prepare("INSERT INTO audit_log(actor_role,actor_team_id,actor_user_id,action,target_type,target_id,detail_json,protected_at) VALUES(?,?,?,?,?,?,?,CURRENT_TIMESTAMP)")
          .bind(actorRole, actorTeamId || null, actorUserId || null, action, targetType, targetId == null ? null : String(targetId), safeDetail ? JSON.stringify(safeDetail).slice(0, 4000) : null)
          .run();
      } catch (error) {
        console.warn("audit log write failed", error?.message || error);
      }
    },

    async listTeam(teamId, limit = 100) {
      const safeLimit = Math.max(1, Math.min(200, Math.trunc(Number(limit) || 100)));
      const result = await db.prepare(`SELECT id,actor_role,actor_team_id,actor_user_id,action,target_type,target_id,detail_json,created_at
                                      FROM audit_log
                                      WHERE actor_team_id=?
                                      ORDER BY datetime(created_at) DESC,id DESC
                                      LIMIT ?`)
        .bind(teamId, safeLimit).all();
      return (result.results || []).map(publicAuditRow);
    },

    async listUserLogins(userId, limit = 20) {
      const safeLimit = Math.max(1, Math.min(50, Math.trunc(Number(limit) || 20)));
      const result = await db.prepare(`SELECT id,actor_role,actor_team_id,actor_user_id,action,target_type,target_id,detail_json,created_at
                                      FROM audit_log
                                      WHERE actor_user_id=? AND action='auth.account.success'
                                      ORDER BY datetime(created_at) DESC,id DESC
                                      LIMIT ?`)
        .bind(userId, safeLimit).all();
      return (result.results || []).map(publicAuditRow);
    }
  };
}

export async function auditEvent(env, actorRole, actorTeamId, action, targetType, targetId, detail = null, actorUserId = null) {
  return createAuditRepository(env.DB).record(actorRole, actorTeamId, action, targetType, targetId, detail, actorUserId);
}
