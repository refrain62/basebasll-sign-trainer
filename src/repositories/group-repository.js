import { getGroup, validGroupId } from "./team-repository.js";

export function createGroupRepository(db) {
  return {
    async findById(teamId, groupId) {
      return db.prepare("SELECT * FROM sign_groups WHERE id=? AND team_id=? AND deleted_at IS NULL").bind(groupId, teamId).first();
    },
    getPublicById: (teamId, groupId) => getGroup(db, teamId, groupId),
    validId: (teamId, value) => validGroupId(db, teamId, value),
    async nextSortOrder(teamId) {
      const row = await db.prepare("SELECT COALESCE(MAX(sort_order),0) AS max_order FROM sign_groups WHERE team_id=? AND deleted_at IS NULL").bind(teamId).first();
      return Number(row?.max_order || 0) + 10;
    },
    async create({ teamId, name, description, youtubeUrl, videoId, sortOrder }) {
      const result = await db.prepare("INSERT INTO sign_groups(team_id,name,description,explanation_youtube_url,explanation_youtube_video_id,sort_order,enabled) VALUES(?,?,?,?,?,?,1)")
        .bind(teamId, name, description, youtubeUrl, videoId, sortOrder).run();
      return Number(result.meta.last_row_id);
    },
    async update({ teamId, groupId, name, description, youtubeUrl, videoId, sortOrder, enabled }) {
      return db.prepare("UPDATE sign_groups SET name=?,description=?,explanation_youtube_url=?,explanation_youtube_video_id=?,sort_order=?,enabled=?,updated_at=CURRENT_TIMESTAMP WHERE id=? AND team_id=? AND deleted_at IS NULL")
        .bind(name, description, youtubeUrl, videoId, sortOrder, enabled, groupId, teamId).run();
    },
    async softDelete(teamId, groupId) {
      return db.batch([
        db.prepare("UPDATE signs SET group_id=NULL,updated_at=CURRENT_TIMESTAMP WHERE team_id=? AND group_id=? AND deleted_at IS NULL").bind(teamId, groupId),
        db.prepare("UPDATE sign_groups SET enabled=0,deleted_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP WHERE id=? AND team_id=? AND deleted_at IS NULL").bind(groupId, teamId)
      ]);
    }
  };
}
