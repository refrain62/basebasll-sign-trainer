export function createDataProtectionRepository(db) {
  return {
    async listTeams(limit) {
      const result = await db.prepare(`SELECT id,name FROM teams
        WHERE deleted_at IS NULL AND name IS NOT NULL AND name <> '' AND name NOT LIKE 'enc:v1:%' LIMIT ?`).bind(limit).all();
      return result.results || [];
    },
    async protectTeam(row) {
      return db.prepare("UPDATE teams SET name=?,updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(row.name, row.id).run();
    },

    async listUsers(limit) {
      const result = await db.prepare(`SELECT id,display_name,email,avatar_url FROM app_users
        WHERE (display_name IS NOT NULL AND display_name <> '' AND display_name NOT LIKE 'enc:v1:%')
           OR (email IS NOT NULL AND email <> '' AND email NOT LIKE 'enc:v1:%')
           OR (avatar_url IS NOT NULL AND avatar_url <> '' AND avatar_url NOT LIKE 'enc:v1:%')
        LIMIT ?`).bind(limit).all();
      return result.results || [];
    },
    async protectUser(row) {
      return db.prepare("UPDATE app_users SET display_name=?,email=?,avatar_url=?,updated_at=CURRENT_TIMESTAMP WHERE id=?")
        .bind(row.display_name, row.email, row.avatar_url, row.id).run();
    },

    async listIdentities(limit) {
      const result = await db.prepare(`SELECT id,user_id,provider,provider_subject,provider_subject_ciphertext,provider_email,display_name,avatar_url
        FROM user_identities
        WHERE provider_subject NOT LIKE 'hmac:v1:%'
           OR (provider_email IS NOT NULL AND provider_email <> '' AND provider_email NOT LIKE 'enc:v1:%')
           OR (display_name IS NOT NULL AND display_name <> '' AND display_name NOT LIKE 'enc:v1:%')
           OR (avatar_url IS NOT NULL AND avatar_url <> '' AND avatar_url NOT LIKE 'enc:v1:%')
        LIMIT ?`).bind(limit).all();
      return result.results || [];
    },
    async protectIdentity(row) {
      return db.prepare(`UPDATE user_identities
                         SET provider_subject=?,provider_subject_ciphertext=?,provider_email=?,display_name=?,avatar_url=?,updated_at=CURRENT_TIMESTAMP
                         WHERE id=?`)
        .bind(row.provider_subject, row.provider_subject_ciphertext, row.provider_email, row.display_name, row.avatar_url, row.id).run();
    },

    async listSigns(limit) {
      const result = await db.prepare(`SELECT id,name FROM signs
        WHERE name IS NOT NULL AND name <> '' AND name NOT LIKE 'enc:v1:%' LIMIT ?`).bind(limit).all();
      return result.results || [];
    },
    async protectSign(row) {
      return db.prepare("UPDATE signs SET name=?,updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(row.name, row.id).run();
    },

    async listGroups(limit) {
      const result = await db.prepare(`SELECT id,name,description,explanation_youtube_url,explanation_youtube_video_id FROM sign_groups
        WHERE (name IS NOT NULL AND name <> '' AND name NOT LIKE 'enc:v1:%')
           OR (description IS NOT NULL AND description <> '' AND description NOT LIKE 'enc:v1:%')
           OR (explanation_youtube_url IS NOT NULL AND explanation_youtube_url <> '' AND explanation_youtube_url NOT LIKE 'enc:v1:%')
           OR (explanation_youtube_video_id IS NOT NULL AND explanation_youtube_video_id <> '' AND explanation_youtube_video_id NOT LIKE 'enc:v1:%')
        LIMIT ?`).bind(limit).all();
      return result.results || [];
    },
    async protectGroup(row) {
      return db.prepare(`UPDATE sign_groups SET name=?,description=?,explanation_youtube_url=?,explanation_youtube_video_id=?,updated_at=CURRENT_TIMESTAMP WHERE id=?`)
        .bind(row.name, row.description, row.explanation_youtube_url, row.explanation_youtube_video_id, row.id).run();
    },

    async listVideos(limit) {
      const result = await db.prepare(`SELECT id,youtube_url,youtube_video_id,comment FROM sign_videos
        WHERE (youtube_url IS NOT NULL AND youtube_url <> '' AND youtube_url NOT LIKE 'enc:v1:%')
           OR (youtube_video_id IS NOT NULL AND youtube_video_id <> '' AND youtube_video_id NOT LIKE 'enc:v1:%')
           OR (comment IS NOT NULL AND comment <> '' AND comment NOT LIKE 'enc:v1:%')
        LIMIT ?`).bind(limit).all();
      return result.results || [];
    },
    async protectVideo(row) {
      return db.prepare("UPDATE sign_videos SET youtube_url=?,youtube_video_id=?,comment=? WHERE id=?")
        .bind(row.youtube_url, row.youtube_video_id, row.comment, row.id).run();
    },

    async listAuditDetails(limit) {
      const result = await db.prepare(`SELECT id,detail_json FROM audit_log WHERE detail_json IS NOT NULL AND protected_at IS NULL LIMIT ?`).bind(limit).all();
      return result.results || [];
    },
    async protectAuditDetail(id, detailJson) {
      return db.prepare("UPDATE audit_log SET detail_json=?,protected_at=CURRENT_TIMESTAMP WHERE id=?").bind(detailJson, id).run();
    },

    async remainingCounts() {
      const queries = [
        ["teams", `SELECT COUNT(*) AS n FROM teams WHERE deleted_at IS NULL AND name IS NOT NULL AND name <> '' AND name NOT LIKE 'enc:v1:%'`],
        ["users", `SELECT COUNT(*) AS n FROM app_users WHERE (display_name IS NOT NULL AND display_name <> '' AND display_name NOT LIKE 'enc:v1:%') OR (email IS NOT NULL AND email <> '' AND email NOT LIKE 'enc:v1:%') OR (avatar_url IS NOT NULL AND avatar_url <> '' AND avatar_url NOT LIKE 'enc:v1:%')`],
        ["identities", `SELECT COUNT(*) AS n FROM user_identities WHERE provider_subject NOT LIKE 'hmac:v1:%' OR (provider_email IS NOT NULL AND provider_email <> '' AND provider_email NOT LIKE 'enc:v1:%') OR (display_name IS NOT NULL AND display_name <> '' AND display_name NOT LIKE 'enc:v1:%') OR (avatar_url IS NOT NULL AND avatar_url <> '' AND avatar_url NOT LIKE 'enc:v1:%')`],
        ["signs", `SELECT COUNT(*) AS n FROM signs WHERE name IS NOT NULL AND name <> '' AND name NOT LIKE 'enc:v1:%'`],
        ["groups", `SELECT COUNT(*) AS n FROM sign_groups WHERE (name IS NOT NULL AND name <> '' AND name NOT LIKE 'enc:v1:%') OR (description IS NOT NULL AND description <> '' AND description NOT LIKE 'enc:v1:%') OR (explanation_youtube_url IS NOT NULL AND explanation_youtube_url <> '' AND explanation_youtube_url NOT LIKE 'enc:v1:%') OR (explanation_youtube_video_id IS NOT NULL AND explanation_youtube_video_id <> '' AND explanation_youtube_video_id NOT LIKE 'enc:v1:%')`],
        ["videos", `SELECT COUNT(*) AS n FROM sign_videos WHERE (youtube_url IS NOT NULL AND youtube_url <> '' AND youtube_url NOT LIKE 'enc:v1:%') OR (youtube_video_id IS NOT NULL AND youtube_video_id <> '' AND youtube_video_id NOT LIKE 'enc:v1:%') OR (comment IS NOT NULL AND comment <> '' AND comment NOT LIKE 'enc:v1:%')`],
        ["audit", `SELECT COUNT(*) AS n FROM audit_log WHERE detail_json IS NOT NULL AND protected_at IS NULL`]
      ];
      const output = {};
      for (const [key, sql] of queries) output[key] = Number((await db.prepare(sql).first())?.n || 0);
      return output;
    }
  };
}
