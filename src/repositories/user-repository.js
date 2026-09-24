async function decryptUserRow(row, protector) {
  if (!row) return null;
  const next = { ...row };
  if (!protector) return next;
  next.display_name = await protector.decrypt(row.display_name, "app_users.display_name");
  next.email = await protector.decrypt(row.email, "app_users.email");
  next.avatar_url = await protector.decrypt(row.avatar_url, "app_users.avatar_url");
  if (Object.hasOwn(row, "provider_email")) next.provider_email = await protector.decrypt(row.provider_email, "user_identities.provider_email");
  if (Object.hasOwn(row, "identity_display_name")) next.identity_display_name = await protector.decrypt(row.identity_display_name, "user_identities.display_name");
  if (Object.hasOwn(row, "identity_avatar_url")) next.identity_avatar_url = await protector.decrypt(row.identity_avatar_url, "user_identities.avatar_url");
  if (Object.hasOwn(row, "provider_subject_ciphertext")) next.provider_subject_plain = await protector.decrypt(row.provider_subject_ciphertext, `user_identities.provider_subject:${row.provider || "unknown"}`);
  return next;
}

async function protectedIdentityValues(protector, { provider, subject, email, displayName, avatarUrl }) {
  if (!protector) return { lookup: subject, ciphertext: null, email: email || null, displayName: displayName || null, avatarUrl: avatarUrl || null };
  return {
    lookup: await protector.lookup(subject, `user_identities.provider_subject:${provider}`),
    ciphertext: await protector.encrypt(subject, `user_identities.provider_subject:${provider}`),
    email: email ? await protector.encrypt(email, "user_identities.provider_email") : null,
    displayName: displayName ? await protector.encrypt(displayName, "user_identities.display_name") : null,
    avatarUrl: avatarUrl ? await protector.encrypt(avatarUrl, "user_identities.avatar_url") : null
  };
}

async function protectedUserValues(protector, { displayName, email, avatarUrl }) {
  if (!protector) return { displayName, email: email || null, avatarUrl: avatarUrl || null };
  return {
    displayName: await protector.encrypt(displayName, "app_users.display_name"),
    email: email ? await protector.encrypt(email, "app_users.email") : null,
    avatarUrl: avatarUrl ? await protector.encrypt(avatarUrl, "app_users.avatar_url") : null
  };
}

export function publicUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    displayName: row.display_name,
    email: row.email || "",
    avatarUrl: row.avatar_url || "",
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export function createUserRepository(db, protector = null) {
  const repo = {
    async findById(userId) {
      const row = await db.prepare("SELECT * FROM app_users WHERE id=? AND deleted_at IS NULL AND status='active'").bind(userId).first();
      return decryptUserRow(row, protector);
    },

    async findByIdentity(provider, subject) {
      const lookup = protector ? await protector.lookup(subject, `user_identities.provider_subject:${provider}`) : subject;
      const select = `
        SELECT u.*, i.id AS identity_id, i.provider, i.provider_subject, i.provider_subject_ciphertext, i.provider_email, i.email_verified,
               i.display_name AS identity_display_name, i.avatar_url AS identity_avatar_url
        FROM user_identities i
        JOIN app_users u ON u.id=i.user_id
        WHERE i.provider=? AND i.provider_subject=? AND u.deleted_at IS NULL AND u.status='active'
      `;
      let row = await db.prepare(select).bind(provider, lookup).first();
      if (!row && protector) {
        row = await db.prepare(select).bind(provider, subject).first();
        if (row) {
          const values = await protectedIdentityValues(protector, {
            provider,
            subject,
            email: await protector.decrypt(row.provider_email, "user_identities.provider_email"),
            displayName: await protector.decrypt(row.identity_display_name, "user_identities.display_name"),
            avatarUrl: await protector.decrypt(row.identity_avatar_url, "user_identities.avatar_url")
          });
          await db.prepare(`UPDATE user_identities
                            SET provider_subject=?,provider_subject_ciphertext=?,provider_email=?,display_name=?,avatar_url=?,updated_at=CURRENT_TIMESTAMP
                            WHERE id=?`)
            .bind(values.lookup, values.ciphertext, values.email, values.displayName, values.avatarUrl, row.identity_id).run();
          row.provider_subject = values.lookup;
          row.provider_subject_ciphertext = values.ciphertext;
          row.provider_email = values.email;
          row.identity_display_name = values.displayName;
          row.identity_avatar_url = values.avatarUrl;
        }
      }
      return decryptUserRow(row, protector);
    },

    async create({ userId, displayName, email, avatarUrl }) {
      const values = await protectedUserValues(protector, { displayName, email, avatarUrl });
      return db.prepare("INSERT INTO app_users(id,display_name,email,avatar_url,status) VALUES(?,?,?,?, 'active')")
        .bind(userId, values.displayName, values.email, values.avatarUrl).run();
    },

    async addIdentity({ userId, provider, subject, email, emailVerified, displayName, avatarUrl }) {
      const values = await protectedIdentityValues(protector, { provider, subject, email, displayName, avatarUrl });
      return db.prepare(`
        INSERT INTO user_identities(user_id,provider,provider_subject,provider_subject_ciphertext,provider_email,email_verified,display_name,avatar_url)
        VALUES(?,?,?,?,?,?,?,?)
      `).bind(userId, provider, values.lookup, values.ciphertext, values.email, emailVerified ? 1 : 0, values.displayName, values.avatarUrl).run();
    },

    async createWithIdentity({ userId, displayName, email, avatarUrl, provider, subject, emailVerified }) {
      const userValues = await protectedUserValues(protector, { displayName, email, avatarUrl });
      const identityValues = await protectedIdentityValues(protector, { provider, subject, email, displayName, avatarUrl });
      return db.batch([
        db.prepare("INSERT INTO app_users(id,display_name,email,avatar_url,status) VALUES(?,?,?,?, 'active')")
          .bind(userId, userValues.displayName, userValues.email, userValues.avatarUrl),
        db.prepare(`INSERT INTO user_identities(user_id,provider,provider_subject,provider_subject_ciphertext,provider_email,email_verified,display_name,avatar_url)
                    VALUES(?,?,?,?,?,?,?,?)`)
          .bind(userId, provider, identityValues.lookup, identityValues.ciphertext, identityValues.email, emailVerified ? 1 : 0, identityValues.displayName, identityValues.avatarUrl)
      ]);
    },

    async updateFromIdentity({ userId, provider, subject, email, emailVerified, displayName, avatarUrl }) {
      const current = await repo.findById(userId);
      if (!current) return null;
      const nextName = displayName || current.display_name;
      const nextEmail = email || current.email || null;
      const nextAvatar = avatarUrl || current.avatar_url || null;
      const userValues = await protectedUserValues(protector, { displayName: nextName, email: nextEmail, avatarUrl: nextAvatar });
      const identityValues = await protectedIdentityValues(protector, { provider, subject, email, displayName, avatarUrl });
      await db.batch([
        db.prepare("UPDATE app_users SET display_name=?,email=?,avatar_url=?,updated_at=CURRENT_TIMESTAMP WHERE id=? AND deleted_at IS NULL")
          .bind(userValues.displayName, userValues.email, userValues.avatarUrl, userId),
        db.prepare(`UPDATE user_identities SET provider_subject_ciphertext=?,provider_email=?,email_verified=?,display_name=?,avatar_url=?,updated_at=CURRENT_TIMESTAMP
                    WHERE user_id=? AND provider=? AND provider_subject=?`)
          .bind(identityValues.ciphertext, identityValues.email, emailVerified ? 1 : 0, identityValues.displayName, identityValues.avatarUrl, userId, provider, identityValues.lookup)
      ]);
      return repo.findById(userId);
    },

    async recordLegalConsent(userId, termsVersion, privacyVersion) {
      return db.prepare(`UPDATE app_users
                         SET terms_version=?,privacy_version=?,legal_accepted_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP
                         WHERE id=? AND deleted_at IS NULL AND status='active'`)
        .bind(termsVersion, privacyVersion, userId).run();
    },

    async listIdentities(userId) {
      const result = await db.prepare("SELECT provider,provider_email,email_verified,display_name,avatar_url,created_at FROM user_identities WHERE user_id=? ORDER BY created_at,id")
        .bind(userId).all();
      const output = [];
      for (const row of result.results || []) {
        output.push({
          provider: row.provider,
          email: protector ? await protector.decrypt(row.provider_email, "user_identities.provider_email") || "" : row.provider_email || "",
          emailVerified: Boolean(row.email_verified),
          displayName: protector ? await protector.decrypt(row.display_name, "user_identities.display_name") || "" : row.display_name || "",
          avatarUrl: protector ? await protector.decrypt(row.avatar_url, "user_identities.avatar_url") || "" : row.avatar_url || "",
          createdAt: row.created_at
        });
      }
      return output;
    },

    async softDelete(userId) {
      const deletedName = protector ? await protector.encrypt("退会ユーザー", "app_users.display_name") : "退会ユーザー";
      const results = await db.batch([
        db.prepare(`UPDATE app_users
                    SET display_name=?,email=NULL,avatar_url=NULL,status='deleted',session_version=session_version+1,deleted_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP
                    WHERE id=? AND deleted_at IS NULL AND status='active'
                      AND NOT EXISTS (SELECT 1 FROM team_admin_memberships WHERE user_id=? AND role='owner')`)
          .bind(deletedName, userId, userId),
        db.prepare(`DELETE FROM user_identities
                    WHERE user_id=? AND EXISTS (SELECT 1 FROM app_users WHERE id=? AND status='deleted' AND deleted_at IS NOT NULL)`)
          .bind(userId, userId),
        db.prepare(`DELETE FROM team_admin_memberships
                    WHERE user_id=? AND EXISTS (SELECT 1 FROM app_users WHERE id=? AND status='deleted' AND deleted_at IS NOT NULL)`)
          .bind(userId, userId)
      ]);
      return Number(results?.[0]?.meta?.changes || 0) > 0;
    },

    publicUser
  };
  return repo;
}
