import { sanitizeAuditDetail } from "../security/audit-detail.js";

export { sanitizeAuditDetail } from "../security/audit-detail.js";

export function createAuditRepository(db) {
  return {
    async record(actorRole, actorTeamId, action, targetType, targetId, detail = null) {
      try {
        const safeDetail = sanitizeAuditDetail(detail);
        await db.prepare("INSERT INTO audit_log(actor_role,actor_team_id,action,target_type,target_id,detail_json,protected_at) VALUES(?,?,?,?,?,?,CURRENT_TIMESTAMP)")
          .bind(actorRole, actorTeamId || null, action, targetType, targetId == null ? null : String(targetId), safeDetail ? JSON.stringify(safeDetail).slice(0, 4000) : null)
          .run();
      } catch (error) {
        console.warn("audit log write failed", error?.message || error);
      }
    }
  };
}

export async function auditEvent(env, actorRole, actorTeamId, action, targetType, targetId, detail = null) {
  return createAuditRepository(env.DB).record(actorRole, actorTeamId, action, targetType, targetId, detail);
}
