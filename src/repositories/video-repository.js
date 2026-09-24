export function createVideoRepository(db) {
  return {
    async findById(teamId, videoId) {
      return db.prepare("SELECT v.*,s.team_id FROM sign_videos v JOIN signs s ON s.id=v.sign_id WHERE v.id=? AND s.team_id=? AND v.deleted_at IS NULL AND s.deleted_at IS NULL")
        .bind(videoId, teamId).first();
    },
    async nextSortOrder(signId) {
      const row = await db.prepare("SELECT COALESCE(MAX(sort_order),0) AS max_order FROM sign_videos WHERE sign_id=?").bind(signId).first();
      return Number(row?.max_order || 0) + 10;
    },
    async create({ signId, youtubeUrl, videoId, sortOrder, comment }) {
      const result = await db.prepare("INSERT INTO sign_videos(sign_id,youtube_url,youtube_video_id,sort_order,enabled,comment) VALUES(?,?,?,?,1,?)")
        .bind(signId, youtubeUrl, videoId, sortOrder, comment).run();
      return Number(result.meta.last_row_id);
    },
    async update({ id, youtubeUrl, videoId, sortOrder, enabled, comment }) {
      return db.prepare("UPDATE sign_videos SET youtube_url=?,youtube_video_id=?,sort_order=?,enabled=?,comment=? WHERE id=? AND deleted_at IS NULL")
        .bind(youtubeUrl, videoId, sortOrder, enabled, comment, id).run();
    },
    async softDelete(id) {
      return db.prepare("UPDATE sign_videos SET enabled=0,deleted_at=CURRENT_TIMESTAMP WHERE id=? AND deleted_at IS NULL").bind(id).run();
    }
  };
}
