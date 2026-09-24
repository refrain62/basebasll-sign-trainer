export function publicTeam(team) {
  return { id: team.id, name: team.name, status: team.status, createdAt: team.created_at, updatedAt: team.updated_at };
}

export async function getTeam(db, teamId) {
  return db.prepare("SELECT id,name,passphrase_hash,admin_password_hash,status,player_session_version,admin_session_version,created_at,updated_at FROM teams WHERE id=? AND deleted_at IS NULL")
    .bind(teamId).first();
}

export async function getTeamSigns(db, teamId, { onlyEnabled = false } = {}) {
  const signSql = onlyEnabled
    ? "SELECT * FROM signs WHERE team_id=? AND enabled=1 AND deleted_at IS NULL ORDER BY sort_order,id"
    : "SELECT * FROM signs WHERE team_id=? AND deleted_at IS NULL ORDER BY sort_order,id";
  const signRows = (await db.prepare(signSql).bind(teamId).all()).results || [];
  if (!signRows.length) return [];
  const ids = signRows.map((s) => s.id);
  const placeholders = ids.map(() => "?").join(",");
  const videoSql = `SELECT * FROM sign_videos WHERE sign_id IN (${placeholders}) AND deleted_at IS NULL${onlyEnabled ? " AND enabled=1" : ""} ORDER BY sort_order,id`;
  const videoRows = (await db.prepare(videoSql).bind(...ids).all()).results || [];
  const bySign = new Map();
  for (const row of videoRows) {
    if (!bySign.has(row.sign_id)) bySign.set(row.sign_id, []);
    bySign.get(row.sign_id).push({
      id: row.id,
      youtubeUrl: row.youtube_url,
      videoId: row.youtube_video_id,
      sortOrder: row.sort_order,
      enabled: Boolean(row.enabled),
      comment: String(row.comment || "")
    });
  }
  return signRows.map((row) => ({
    id: String(row.id),
    dbId: row.id,
    name: row.name,
    sortOrder: row.sort_order,
    enabled: Boolean(row.enabled),
    groupId: row.group_id == null ? null : Number(row.group_id),
    videos: (bySign.get(row.id) || []).map((v) => onlyEnabled ? v.videoId : v),
    videoItems: onlyEnabled ? undefined : (bySign.get(row.id) || [])
  })).filter((sign) => !onlyEnabled || sign.videos.length > 0);
}

export async function getTeamGroups(db, teamId, { onlyEnabled = false } = {}) {
  const sql = `SELECT id,name,description,explanation_youtube_url,explanation_youtube_video_id,sort_order,enabled FROM sign_groups WHERE team_id=? AND deleted_at IS NULL${onlyEnabled ? " AND enabled=1" : ""} ORDER BY sort_order,id`;
  const rows = (await db.prepare(sql).bind(teamId).all()).results || [];
  return rows.map((row) => ({
    id: Number(row.id),
    name: row.name,
    description: String(row.description || ""),
    youtubeUrl: String(row.explanation_youtube_url || ""),
    videoId: String(row.explanation_youtube_video_id || ""),
    sortOrder: Number(row.sort_order || 0),
    enabled: Boolean(row.enabled)
  }));
}

export async function getGroup(db, teamId, groupId) {
  const groups = await getTeamGroups(db, teamId, { onlyEnabled: false });
  return groups.find((group) => Number(group.id) === Number(groupId)) || null;
}

export async function validGroupId(db, teamId, value) {
  if (value === null || value === undefined || value === "") return null;
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) return null;
  const row = await db.prepare("SELECT id FROM sign_groups WHERE id=? AND team_id=? AND deleted_at IS NULL").bind(id, teamId).first();
  return row ? id : null;
}

export async function getSignWithVideos(db, teamId, signId) {
  const signs = await getTeamSigns(db, teamId, { onlyEnabled: false });
  return signs.find((sign) => Number(sign.dbId) === Number(signId)) || null;
}

export function createTeamRepository(db) {
  return {
    findById: (teamId) => getTeam(db, teamId),
    publicTeam,
    getSigns: (teamId, options) => getTeamSigns(db, teamId, options),
    getGroups: (teamId, options) => getTeamGroups(db, teamId, options),
    async rehashPassphrase(teamId, passphraseHash) {
      return db.prepare("UPDATE teams SET passphrase_hash=?,updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(passphraseHash, teamId).run();
    },
    async rehashAdminPassword(teamId, passwordHash) {
      return db.prepare("UPDATE teams SET admin_password_hash=?,updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(passwordHash, teamId).run();
    },
    async updateFromTeamAdmin({ teamId, name, passphraseHash, adminHash, passphraseChanged, adminPasswordChanged }) {
      return db.prepare("UPDATE teams SET name=?, passphrase_hash=?, admin_password_hash=?, player_session_version=player_session_version+?, admin_session_version=admin_session_version+?, updated_at=CURRENT_TIMESTAMP WHERE id=?")
        .bind(name, passphraseHash, adminHash, passphraseChanged ? 1 : 0, adminPasswordChanged ? 1 : 0, teamId).run();
    },
    async listWithCounts() {
      const result = await db.prepare(`
        SELECT t.id,t.name,t.status,t.created_at,t.updated_at,COUNT(DISTINCT s.id) AS sign_count,COUNT(DISTINCT v.id) AS video_count
        FROM teams t
        LEFT JOIN signs s ON s.team_id=t.id AND s.deleted_at IS NULL
        LEFT JOIN sign_videos v ON v.sign_id=s.id AND v.deleted_at IS NULL
        WHERE t.deleted_at IS NULL
        GROUP BY t.id
        ORDER BY t.created_at DESC
      `).all();
      return (result.results || []).map((row) => ({ ...row, sign_count: Number(row.sign_count || 0), video_count: Number(row.video_count || 0) }));
    },
    async idExists(teamId) {
      return Boolean(await db.prepare("SELECT id FROM teams WHERE id=?").bind(teamId).first());
    },
    async create({ teamId, name, passphraseHash, adminHash }) {
      return db.prepare("INSERT INTO teams(id,name,passphrase_hash,admin_password_hash,status) VALUES(?,?,?,?, 'active')")
        .bind(teamId, name, passphraseHash, adminHash).run();
    },
    async updateFromSystem({ teamId, name, status, passphraseHash, adminHash, invalidatePlayer, invalidateAdmin }) {
      return db.prepare("UPDATE teams SET name=?,status=?,passphrase_hash=?,admin_password_hash=?,player_session_version=player_session_version+?,admin_session_version=admin_session_version+?,updated_at=CURRENT_TIMESTAMP WHERE id=?")
        .bind(name, status, passphraseHash, adminHash, invalidatePlayer ? 1 : 0, invalidateAdmin ? 1 : 0, teamId).run();
    },
    async softDelete(teamId) {
      return db.prepare("UPDATE teams SET status='suspended',deleted_at=CURRENT_TIMESTAMP,player_session_version=player_session_version+1,admin_session_version=admin_session_version+1,updated_at=CURRENT_TIMESTAMP WHERE id=?")
        .bind(teamId).run();
    }
  };
}
