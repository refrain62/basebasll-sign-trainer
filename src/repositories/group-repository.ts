import { getGroup, validGroupId } from "./team-repository.ts";

export function createGroupRepository(db, protector = null) {
  return {
    async findById(teamId, groupId) {
      const row = await db.prepare("SELECT * FROM sign_groups WHERE id=? AND team_id=? AND deleted_at IS NULL").bind(groupId, teamId).first();
      if (!row || !protector) return row;
      return {
        ...row,
        name: await protector.decrypt(row.name, "sign_groups.name"),
        description: await protector.decrypt(row.description, "sign_groups.description"),
        explanation_youtube_url: await protector.decrypt(row.explanation_youtube_url, "sign_groups.explanation_youtube_url"),
        explanation_youtube_video_id: await protector.decrypt(row.explanation_youtube_video_id, "sign_groups.explanation_youtube_video_id")
      };
    },
    getPublicById: (teamId, groupId) => getGroup(db, teamId, groupId, protector),
    validId: (teamId, value) => validGroupId(db, teamId, value),
    async nextSortOrder(teamId) {
      const row = await db.prepare("SELECT COALESCE(MAX(sort_order),0) AS max_order FROM sign_groups WHERE team_id=? AND deleted_at IS NULL").bind(teamId).first();
      return Number(row?.max_order || 0) + 10;
    },
    async create({ teamId, name, description, youtubeUrl, videoId, sortOrder }) {
      const values = protector ? {
        name: await protector.encrypt(name, "sign_groups.name"),
        description: await protector.encrypt(description, "sign_groups.description"),
        youtubeUrl: await protector.encrypt(youtubeUrl, "sign_groups.explanation_youtube_url"),
        videoId: await protector.encrypt(videoId, "sign_groups.explanation_youtube_video_id")
      } : { name, description, youtubeUrl, videoId };
      const result = await db.prepare("INSERT INTO sign_groups(team_id,name,description,explanation_youtube_url,explanation_youtube_video_id,sort_order,enabled) VALUES(?,?,?,?,?,?,1)")
        .bind(teamId, values.name, values.description, values.youtubeUrl, values.videoId, sortOrder).run();
      return Number(result.meta.last_row_id);
    },
    async update({ teamId, groupId, name, description, youtubeUrl, videoId, sortOrder, enabled }) {
      const values = protector ? {
        name: await protector.encrypt(name, "sign_groups.name"),
        description: await protector.encrypt(description, "sign_groups.description"),
        youtubeUrl: await protector.encrypt(youtubeUrl, "sign_groups.explanation_youtube_url"),
        videoId: await protector.encrypt(videoId, "sign_groups.explanation_youtube_video_id")
      } : { name, description, youtubeUrl, videoId };
      return db.prepare("UPDATE sign_groups SET name=?,description=?,explanation_youtube_url=?,explanation_youtube_video_id=?,sort_order=?,enabled=?,updated_at=CURRENT_TIMESTAMP WHERE id=? AND team_id=? AND deleted_at IS NULL")
        .bind(values.name, values.description, values.youtubeUrl, values.videoId, sortOrder, enabled, groupId, teamId).run();
    },
    async softDelete(teamId, groupId) {
      return db.batch([
        db.prepare("UPDATE signs SET group_id=NULL,updated_at=CURRENT_TIMESTAMP WHERE team_id=? AND group_id=? AND deleted_at IS NULL").bind(teamId, groupId),
        db.prepare("UPDATE sign_groups SET enabled=0,deleted_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP WHERE id=? AND team_id=? AND deleted_at IS NULL").bind(groupId, teamId)
      ]);
    }
  };
}
