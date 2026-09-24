export function createAuditRepository(db) {
  return {
    async record(actorRole, actorTeamId, action, targetType, targetId, detail = null) {
      try {
        await db.prepare("INSERT INTO audit_log(actor_role,actor_team_id,action,target_type,target_id,detail_json) VALUES(?,?,?,?,?,?)")
          .bind(actorRole, actorTeamId || null, action, targetType, targetId == null ? null : String(targetId), detail ? JSON.stringify(detail).slice(0, 4000) : null)
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
