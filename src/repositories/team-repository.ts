async function decryptTeamContent(row, protector) {
  if (!row || !protector) return row;
  return { ...row, name: await protector.decrypt(row.name, "teams.name") };
}

async function decryptVideoRow(row, protector) {
  if (!row || !protector) return row;
  return {
    ...row,
    youtube_url: await protector.decrypt(row.youtube_url, "sign_videos.youtube_url"),
    youtube_video_id: await protector.decrypt(row.youtube_video_id, "sign_videos.youtube_video_id"),
    comment: await protector.decrypt(row.comment, "sign_videos.comment")
  };
}

async function decryptSignRow(row, protector) {
  if (!row || !protector) return row;
  return { ...row, name: await protector.decrypt(row.name, "signs.name") };
}

async function decryptGroupRow(row, protector) {
  if (!row || !protector) return row;
  return {
    ...row,
    name: await protector.decrypt(row.name, "sign_groups.name"),
    description: await protector.decrypt(row.description, "sign_groups.description"),
    explanation_youtube_url: await protector.decrypt(row.explanation_youtube_url, "sign_groups.explanation_youtube_url"),
    explanation_youtube_video_id: await protector.decrypt(row.explanation_youtube_video_id, "sign_groups.explanation_youtube_video_id")
  };
}

export function publicTeam(team) {
  return { id: team.id, name: team.name, status: team.status, createdAt: team.created_at, updatedAt: team.updated_at };
}

export async function getTeam(db, teamId, protector = null) {
  const row = await db.prepare("SELECT id,name,passphrase_hash,admin_password_hash,admin_password_enabled,status,player_session_version,admin_session_version,created_at,updated_at FROM teams WHERE id=? AND deleted_at IS NULL")
    .bind(teamId).first();
  return decryptTeamContent(row, protector);
}

export async function getTeamSigns(db, teamId, { onlyEnabled = false } = {}, protector = null) {
  const signSql = onlyEnabled
    ? "SELECT * FROM signs WHERE team_id=? AND enabled=1 AND deleted_at IS NULL ORDER BY sort_order,id"
    : "SELECT * FROM signs WHERE team_id=? AND deleted_at IS NULL ORDER BY sort_order,id";
  const rawSignRows = (await db.prepare(signSql).bind(teamId).all()).results || [];
  const signRows = [];
  for (const row of rawSignRows) signRows.push(await decryptSignRow(row, protector));
  if (!signRows.length) return [];
  const ids = signRows.map((s) => s.id);
  const placeholders = ids.map(() => "?").join(",");
  const videoSql = `SELECT * FROM sign_videos WHERE sign_id IN (${placeholders}) AND deleted_at IS NULL${onlyEnabled ? " AND enabled=1" : ""} ORDER BY sort_order,id`;
  const rawVideoRows = (await db.prepare(videoSql).bind(...ids).all()).results || [];
  const videoRows = [];
  for (const row of rawVideoRows) videoRows.push(await decryptVideoRow(row, protector));
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

export async function getTeamGroups(db, teamId, { onlyEnabled = false } = {}, protector = null) {
  const sql = `SELECT id,name,description,explanation_youtube_url,explanation_youtube_video_id,sort_order,enabled FROM sign_groups WHERE team_id=? AND deleted_at IS NULL${onlyEnabled ? " AND enabled=1" : ""} ORDER BY sort_order,id`;
  const rows = (await db.prepare(sql).bind(teamId).all()).results || [];
  const output = [];
  for (const raw of rows) {
    const row = await decryptGroupRow(raw, protector);
    output.push({
      id: Number(row.id),
      name: row.name,
      description: String(row.description || ""),
      youtubeUrl: String(row.explanation_youtube_url || ""),
      videoId: String(row.explanation_youtube_video_id || ""),
      sortOrder: Number(row.sort_order || 0),
      enabled: Boolean(row.enabled)
    });
  }
  return output;
}

export async function getGroup(db, teamId, groupId, protector = null) {
  const raw = await db.prepare(`
    SELECT id,name,description,explanation_youtube_url,explanation_youtube_video_id,sort_order,enabled
    FROM sign_groups
    WHERE id=? AND team_id=? AND deleted_at IS NULL
  `).bind(groupId, teamId).first();
  if (!raw) return null;
  const row = await decryptGroupRow(raw, protector);
  return {
    id: Number(row.id),
    name: row.name,
    description: String(row.description || ""),
    youtubeUrl: String(row.explanation_youtube_url || ""),
    videoId: String(row.explanation_youtube_video_id || ""),
    sortOrder: Number(row.sort_order || 0),
    enabled: Boolean(row.enabled)
  };
}

export async function validGroupId(db, teamId, value) {
  if (value === null || value === undefined || value === "") return null;
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) return null;
  const row = await db.prepare("SELECT id FROM sign_groups WHERE id=? AND team_id=? AND deleted_at IS NULL").bind(id, teamId).first();
  return row ? id : null;
}

export async function getSignWithVideos(db, teamId, signId, protector = null) {
  const rawSign = await db.prepare(`
    SELECT * FROM signs
    WHERE id=? AND team_id=? AND deleted_at IS NULL
  `).bind(signId, teamId).first();
  if (!rawSign) return null;

  const sign = await decryptSignRow(rawSign, protector);
  const rawVideoRows = (await db.prepare(`
    SELECT * FROM sign_videos
    WHERE sign_id=? AND deleted_at IS NULL
    ORDER BY sort_order,id
  `).bind(signId).all()).results || [];
  const videoItems = [];
  for (const rawVideo of rawVideoRows) {
    const row = await decryptVideoRow(rawVideo, protector);
    videoItems.push({
      id: row.id,
      youtubeUrl: row.youtube_url,
      videoId: row.youtube_video_id,
      sortOrder: row.sort_order,
      enabled: Boolean(row.enabled),
      comment: String(row.comment || "")
    });
  }

  return {
    id: String(sign.id),
    dbId: sign.id,
    name: sign.name,
    sortOrder: sign.sort_order,
    enabled: Boolean(sign.enabled),
    groupId: sign.group_id == null ? null : Number(sign.group_id),
    videos: videoItems,
    videoItems
  };
}

export function createTeamRepository(db, protector = null) {
  return {
    findById: (teamId) => getTeam(db, teamId, protector),
    publicTeam,
    getSigns: (teamId, options) => getTeamSigns(db, teamId, options, protector),
    getGroups: (teamId, options) => getTeamGroups(db, teamId, options, protector),
    async rehashPassphrase(teamId, passphraseHash) {
      return db.prepare("UPDATE teams SET passphrase_hash=?,updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(passphraseHash, teamId).run();
    },
    async rehashAdminPassword(teamId, passwordHash) {
      return db.prepare("UPDATE teams SET admin_password_hash=?,updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(passwordHash, teamId).run();
    },
    async updateFromTeamAdmin({ teamId, name, passphraseHash, adminHash, passphraseChanged, adminPasswordChanged }) {
      const protectedName = protector ? await protector.encrypt(name, "teams.name") : name;
      return db.prepare("UPDATE teams SET name=?, passphrase_hash=?, admin_password_hash=?, player_session_version=player_session_version+?, admin_session_version=admin_session_version+?, updated_at=CURRENT_TIMESTAMP WHERE id=?")
        .bind(protectedName, passphraseHash, adminHash, passphraseChanged ? 1 : 0, adminPasswordChanged ? 1 : 0, teamId).run();
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
      const output = [];
      for (const row of result.results || []) {
        output.push({ ...row, name: protector ? await protector.decrypt(row.name, "teams.name") : row.name, sign_count: Number(row.sign_count || 0), video_count: Number(row.video_count || 0) });
      }
      return output;
    },
    async idExists(teamId) {
      return Boolean(await db.prepare("SELECT id FROM teams WHERE id=?").bind(teamId).first());
    },
    async create({ teamId, name, passphraseHash, adminHash, adminPasswordEnabled = true }) {
      const protectedName = protector ? await protector.encrypt(name, "teams.name") : name;
      return db.prepare("INSERT INTO teams(id,name,passphrase_hash,admin_password_hash,admin_password_enabled,status) VALUES(?,?,?,?,?, 'active')")
        .bind(teamId, protectedName, passphraseHash, adminHash, adminPasswordEnabled ? 1 : 0).run();
    },
    async disableAdminPassword(teamId) {
      return db.prepare("UPDATE teams SET admin_password_enabled=0,admin_session_version=admin_session_version+1,updated_at=CURRENT_TIMESTAMP WHERE id=? AND deleted_at IS NULL")
        .bind(teamId).run();
    },
    async updateFromSystem({ teamId, name, status, passphraseHash, adminHash, invalidatePlayer, invalidateAdmin }) {
      const protectedName = protector ? await protector.encrypt(name, "teams.name") : name;
      return db.prepare("UPDATE teams SET name=?,status=?,passphrase_hash=?,admin_password_hash=?,player_session_version=player_session_version+?,admin_session_version=admin_session_version+?,updated_at=CURRENT_TIMESTAMP WHERE id=?")
        .bind(protectedName, status, passphraseHash, adminHash, invalidatePlayer ? 1 : 0, invalidateAdmin ? 1 : 0, teamId).run();
    },
    async softDelete(teamId) {
      return db.prepare("UPDATE teams SET status='suspended',deleted_at=CURRENT_TIMESTAMP,player_session_version=player_session_version+1,admin_session_version=admin_session_version+1,updated_at=CURRENT_TIMESTAMP WHERE id=?")
        .bind(teamId).run();
    }
  };
}
