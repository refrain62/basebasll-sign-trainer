export function createVideoRepository(db, protector = null) {
  async function decryptRow(row) {
    if (!row || !protector) return row;
    return {
      ...row,
      youtube_url: await protector.decrypt(row.youtube_url, "sign_videos.youtube_url"),
      youtube_video_id: await protector.decrypt(row.youtube_video_id, "sign_videos.youtube_video_id"),
      comment: await protector.decrypt(row.comment, "sign_videos.comment")
    };
  }
  return {
    async findById(teamId, videoId) {
      const row = await db.prepare("SELECT v.*,s.team_id FROM sign_videos v JOIN signs s ON s.id=v.sign_id WHERE v.id=? AND s.team_id=? AND v.deleted_at IS NULL AND s.deleted_at IS NULL")
        .bind(videoId, teamId).first();
      return decryptRow(row);
    },
    async nextSortOrder(signId) {
      const row = await db.prepare("SELECT COALESCE(MAX(sort_order),0) AS max_order FROM sign_videos WHERE sign_id=?").bind(signId).first();
      return Number(row?.max_order || 0) + 10;
    },
    async create({ signId, youtubeUrl, videoId, sortOrder, comment }) {
      const values = protector ? {
        youtubeUrl: await protector.encrypt(youtubeUrl, "sign_videos.youtube_url"),
        videoId: await protector.encrypt(videoId, "sign_videos.youtube_video_id"),
        comment: await protector.encrypt(comment, "sign_videos.comment")
      } : { youtubeUrl, videoId, comment };
      const result = await db.prepare("INSERT INTO sign_videos(sign_id,youtube_url,youtube_video_id,sort_order,enabled,comment) VALUES(?,?,?,?,1,?)")
        .bind(signId, values.youtubeUrl, values.videoId, sortOrder, values.comment).run();
      return Number(result.meta.last_row_id);
    },
    async update({ id, youtubeUrl, videoId, sortOrder, enabled, comment }) {
      const values = protector ? {
        youtubeUrl: await protector.encrypt(youtubeUrl, "sign_videos.youtube_url"),
        videoId: await protector.encrypt(videoId, "sign_videos.youtube_video_id"),
        comment: await protector.encrypt(comment, "sign_videos.comment")
      } : { youtubeUrl, videoId, comment };
      return db.prepare("UPDATE sign_videos SET youtube_url=?,youtube_video_id=?,sort_order=?,enabled=?,comment=? WHERE id=? AND deleted_at IS NULL")
        .bind(values.youtubeUrl, values.videoId, sortOrder, enabled, values.comment, id).run();
    },
    async softDelete(id) {
      return db.prepare("UPDATE sign_videos SET enabled=0,deleted_at=CURRENT_TIMESTAMP WHERE id=? AND deleted_at IS NULL").bind(id).run();
    }
  };
}
