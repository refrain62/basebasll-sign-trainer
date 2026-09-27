export function createSystemNoticeRepository(db) {
  return {
    async list() {
      const { results = [] } = await db.prepare(`SELECT id,title,body,kind,status,publish_at,expires_at,created_at,updated_at
        FROM system_notices ORDER BY COALESCE(publish_at,created_at) DESC, id DESC`).all();
      return results;
    },
    async listPublished() {
      const { results = [] } = await db.prepare(`SELECT id,title,body,kind,publish_at,expires_at,created_at
        FROM system_notices
        WHERE status='published'
          AND (publish_at IS NULL OR datetime(publish_at) <= CURRENT_TIMESTAMP)
          AND (expires_at IS NULL OR datetime(expires_at) > CURRENT_TIMESTAMP)
        ORDER BY COALESCE(publish_at,created_at) DESC, id DESC`).all();
      return results;
    },
    async create(input) {
      const result = await db.prepare(`INSERT INTO system_notices(title,body,kind,status,publish_at,expires_at,updated_at)
        VALUES(?,?,?,?,?,?,CURRENT_TIMESTAMP)`).bind(input.title,input.body,input.kind,input.status,input.publishAt || null,input.expiresAt || null).run();
      return this.get(result.meta?.last_row_id);
    },
    async get(id) {
      return db.prepare(`SELECT id,title,body,kind,status,publish_at,expires_at,created_at,updated_at FROM system_notices WHERE id=?`).bind(id).first();
    },
    async update(id,input) {
      await db.prepare(`UPDATE system_notices SET title=?,body=?,kind=?,status=?,publish_at=?,expires_at=?,updated_at=CURRENT_TIMESTAMP WHERE id=?`)
        .bind(input.title,input.body,input.kind,input.status,input.publishAt || null,input.expiresAt || null,id).run();
      return this.get(id);
    },
    async remove(id) { return db.prepare("DELETE FROM system_notices WHERE id=?").bind(id).run(); }
  };
}
