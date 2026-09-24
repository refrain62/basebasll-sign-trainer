import { getSignWithVideos } from "./team-repository.js";

export function createSignRepository(db, protector = null) {
  return {
    async findById(teamId, signId) {
      const row = await db.prepare("SELECT * FROM signs WHERE id=? AND team_id=? AND deleted_at IS NULL").bind(signId, teamId).first();
      if (!row || !protector) return row;
      return { ...row, name: await protector.decrypt(row.name, "signs.name") };
    },
    getWithVideos: (teamId, signId) => getSignWithVideos(db, teamId, signId, protector),
    async nextSortOrder(teamId) {
      const row = await db.prepare("SELECT COALESCE(MAX(sort_order),0) AS max_order FROM signs WHERE team_id=?").bind(teamId).first();
      return Number(row?.max_order || 0) + 10;
    },
    async create({ teamId, name, sortOrder, groupId }) {
      const protectedName = protector ? await protector.encrypt(name, "signs.name") : name;
      const result = await db.prepare("INSERT INTO signs(team_id,name,sort_order,enabled,group_id) VALUES(?,?,?,1,?)")
        .bind(teamId, protectedName, sortOrder, groupId).run();
      return Number(result.meta.last_row_id);
    },
    async hardDelete(teamId, signId) {
      return db.prepare("DELETE FROM signs WHERE id=? AND team_id=?").bind(signId, teamId).run();
    },
    async update({ teamId, signId, name, sortOrder, enabled, groupId }) {
      const protectedName = protector ? await protector.encrypt(name, "signs.name") : name;
      return db.prepare("UPDATE signs SET name=?,sort_order=?,enabled=?,group_id=?,updated_at=CURRENT_TIMESTAMP WHERE id=? AND team_id=? AND deleted_at IS NULL")
        .bind(protectedName, sortOrder, enabled, groupId, signId, teamId).run();
    },
    async softDelete(teamId, signId) {
      return db.batch([
        db.prepare("UPDATE sign_videos SET enabled=0,deleted_at=CURRENT_TIMESTAMP WHERE sign_id=? AND deleted_at IS NULL").bind(signId),
        db.prepare("UPDATE signs SET enabled=0,deleted_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP WHERE id=? AND team_id=? AND deleted_at IS NULL").bind(signId, teamId)
      ]);
    }
  };
}
