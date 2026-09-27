import { sanitizeAuditDetail } from "../security/audit-detail.ts";

function protectOptional(protector, value, context) {
  if (value === null || value === undefined || value === "") return Promise.resolve(value);
  return protector.encrypt(value, context);
}

export function createDataProtectionService({ repository, protector }) {
  async function protectOnce(batchSize) {
    const counts = { teams: 0, users: 0, identities: 0, signs: 0, groups: 0, videos: 0, audit: 0, skippedIdentities: 0 };

    for (const row of await repository.listTeams(batchSize)) {
      await repository.protectTeam({ ...row, name: await protector.encrypt(row.name, "teams.name") });
      counts.teams += 1;
    }

    for (const row of await repository.listUsers(batchSize)) {
      await repository.protectUser({
        ...row,
        display_name: await protectOptional(protector, row.display_name, "app_users.display_name"),
        email: await protectOptional(protector, row.email, "app_users.email"),
        avatar_url: await protectOptional(protector, row.avatar_url, "app_users.avatar_url")
      });
      counts.users += 1;
    }

    for (const row of await repository.listIdentities(batchSize)) {
      const legacySubject = protector.isLookup(row.provider_subject) ? "" : String(row.provider_subject || "");
      let protectedSubject = row.provider_subject;
      let subjectCiphertext = row.provider_subject_ciphertext;
      if (legacySubject || row.provider_subject_ciphertext) {
        const subject = legacySubject || await protector.decrypt(row.provider_subject_ciphertext, `user_identities.provider_subject:${row.provider}`);
        protectedSubject = await protector.lookup(subject, `user_identities.provider_subject:${row.provider}`);
        subjectCiphertext = await protector.encrypt(subject, `user_identities.provider_subject:${row.provider}`);
      } else {
        counts.skippedIdentities += 1;
      }
      await repository.protectIdentity({
        ...row,
        provider_subject: protectedSubject,
        provider_subject_ciphertext: subjectCiphertext,
        provider_email: await protectOptional(protector, row.provider_email, "user_identities.provider_email"),
        display_name: await protectOptional(protector, row.display_name, "user_identities.display_name"),
        avatar_url: await protectOptional(protector, row.avatar_url, "user_identities.avatar_url")
      });
      counts.identities += 1;
    }

    for (const row of await repository.listSigns(batchSize)) {
      await repository.protectSign({ ...row, name: await protector.encrypt(row.name, "signs.name") });
      counts.signs += 1;
    }

    for (const row of await repository.listGroups(batchSize)) {
      await repository.protectGroup({
        ...row,
        name: await protectOptional(protector, row.name, "sign_groups.name"),
        description: await protectOptional(protector, row.description, "sign_groups.description"),
        explanation_youtube_url: await protectOptional(protector, row.explanation_youtube_url, "sign_groups.explanation_youtube_url"),
        explanation_youtube_video_id: await protectOptional(protector, row.explanation_youtube_video_id, "sign_groups.explanation_youtube_video_id")
      });
      counts.groups += 1;
    }

    for (const row of await repository.listVideos(batchSize)) {
      await repository.protectVideo({
        ...row,
        youtube_url: await protectOptional(protector, row.youtube_url, "sign_videos.youtube_url"),
        youtube_video_id: await protectOptional(protector, row.youtube_video_id, "sign_videos.youtube_video_id"),
        comment: await protectOptional(protector, row.comment, "sign_videos.comment")
      });
      counts.videos += 1;
    }

    for (const row of await repository.listAuditDetails(batchSize)) {
      let parsed = null;
      try { parsed = JSON.parse(String(row.detail_json || "null")); } catch { parsed = { legacyDetail: "[redacted]" }; }
      const safe = sanitizeAuditDetail(parsed);
      await repository.protectAuditDetail(row.id, safe ? JSON.stringify(safe).slice(0, 4000) : null);
      counts.audit += 1;
    }

    return counts;
  }

  return {
    async protectExisting({ batchSize = 100, maxBatches = 10 } = {}) {
      batchSize = Math.max(10, Math.min(Number(batchSize) || 100, 250));
      maxBatches = Math.max(1, Math.min(Number(maxBatches) || 10, 20));
      const total = { teams: 0, users: 0, identities: 0, signs: 0, groups: 0, videos: 0, audit: 0, skippedIdentities: 0 };
      for (let i = 0; i < maxBatches; i += 1) {
        const counts = await protectOnce(batchSize);
        for (const key of Object.keys(total)) total[key] += counts[key] || 0;
        const processed = counts.teams + counts.users + counts.identities + counts.signs + counts.groups + counts.videos + counts.audit;
        if (processed === 0) break;
      }
      const remaining = await repository.remainingCounts();
      return { protected: total, remaining, complete: Object.values(remaining).every((value) => Number(value) === 0) };
    },
    status: () => repository.remainingCounts()
  };
}
