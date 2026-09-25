import { test } from "vitest";
import assert from "node:assert/strict";
import { createDataProtector } from "../../src/security/data-protection.ts";
import { createDataProtectionService } from "../../src/services/data-protection-service.ts";

const protector = createDataProtector({
  encryptionKey: "SignTrainerDataProtectionTestEncryptionKey2026",
  lookupKey: "SignTrainerDataProtectionTestLookupKey2026"
});

test("data protection service encrypts legacy sensitive fields and redacts audit details", async () => {
  const stored = { teams: [], users: [], identities: [], signs: [], groups: [], videos: [], audit: [] };
  let first = true;
  const repository = {
    async listTeams() { if (!first) return []; return [{ id: "t1", name: "熊本ジュニア" }]; },
    async protectTeam(row) { stored.teams.push(row); },
    async listUsers() { if (!first) return []; return [{ id: "u1", display_name: "Coach", email: "coach@example.com", avatar_url: "https://example.com/a.png" }]; },
    async protectUser(row) { stored.users.push(row); },
    async listIdentities() { if (!first) return []; return [{ id: 1, provider: "google", provider_subject: "google-sub-123", provider_subject_ciphertext: null, provider_email: "coach@example.com", display_name: "Coach", avatar_url: "" }]; },
    async protectIdentity(row) { stored.identities.push(row); },
    async listSigns() { if (!first) return []; return [{ id: 1, name: "スクイズ" }]; },
    async protectSign(row) { stored.signs.push(row); },
    async listGroups() { if (!first) return []; return [{ id: 1, name: "Aサイン", description: "帽子→胸", explanation_youtube_url: "https://youtu.be/abc12345678", explanation_youtube_video_id: "abc12345678" }]; },
    async protectGroup(row) { stored.groups.push(row); },
    async listVideos() { if (!first) return []; return [{ id: 1, youtube_url: "https://youtu.be/abc12345678", youtube_video_id: "abc12345678", comment: "試合前に確認" }]; },
    async protectVideo(row) { stored.videos.push(row); },
    async listAuditDetails() { if (!first) return []; first = false; return [{ id: 1, detail_json: JSON.stringify({ name: "スクイズ", enabled: true }) }]; },
    async protectAuditDetail(id, detailJson) { stored.audit.push({ id, detailJson }); },
    async remainingCounts() { return { teams: 0, users: 0, identities: 0, signs: 0, groups: 0, videos: 0, audit: 0 }; }
  };

  const service = createDataProtectionService({ repository, protector });
  const result = await service.protectExisting({ batchSize: 20, maxBatches: 2 });
  assert.equal(result.complete, true);
  assert.match(stored.teams[0].name, /^enc:v1:/);
  assert.equal(await protector.decrypt(stored.teams[0].name, "teams.name"), "熊本ジュニア");
  assert.match(stored.users[0].email, /^enc:v1:/);
  assert.match(stored.identities[0].provider_subject, /^hmac:v1:/);
  assert.match(stored.identities[0].provider_subject_ciphertext, /^enc:v1:/);
  assert.match(stored.signs[0].name, /^enc:v1:/);
  assert.equal(await protector.decrypt(stored.signs[0].name, "signs.name"), "スクイズ");
  assert.match(stored.groups[0].description, /^enc:v1:/);
  assert.match(stored.videos[0].comment, /^enc:v1:/);
  assert.equal(JSON.parse(stored.audit[0].detailJson).name, "[redacted]");
});

import { createUserRepository } from "../../src/repositories/user-repository.ts";

test("legacy OAuth subject is transparently migrated to HMAC lookup plus encrypted ciphertext", async () => {
  const updates = [];
  const db = {
    prepare(sql) {
      return {
        bind(...params) {
          return {
            async first() {
              if (sql.includes("FROM user_identities i")) {
                if (String(params[1]).startsWith("hmac:v1:")) return null;
                if (params[1] === "legacy-google-sub") {
                  return {
                    id: "u1",
                    identity_id: 7,
                    display_name: "Coach",
                    email: "coach@example.com",
                    avatar_url: "",
                    status: "active",
                    session_version: 1,
                    created_at: "2026-01-01",
                    updated_at: "2026-01-01",
                    provider: "google",
                    provider_subject: "legacy-google-sub",
                    provider_subject_ciphertext: null,
                    provider_email: "coach@example.com",
                    email_verified: 1,
                    identity_display_name: "Coach",
                    identity_avatar_url: ""
                  };
                }
              }
              return null;
            },
            async run() { updates.push({ sql, params }); return { success: true, meta: { changes: 1 } }; }
          };
        }
      };
    }
  };
  const repo = createUserRepository(db, protector);
  const user = await repo.findByIdentity("google", "legacy-google-sub");
  assert.equal(user.id, "u1");
  assert.equal(user.display_name, "Coach");
  const update = updates.find((entry) => entry.sql.includes("UPDATE user_identities"));
  assert.ok(update);
  assert.match(update.params[0], /^hmac:v1:/);
  assert.match(update.params[1], /^enc:v1:/);
  assert.equal(update.params.at(-1), 7);
});

import { createAccountProvisioningRepository } from "../../src/repositories/account-provisioning-repository.ts";
import { createAdminMembershipRepository } from "../../src/repositories/admin-membership-repository.ts";

test("new self-service teams are encrypted before D1 persistence", async () => {
  const bound = [];
  const db = {
    prepare(sql) {
      return { bind(...params) { bound.push({ sql, params }); return { sql, params }; } };
    },
    async batch(statements) { return statements; }
  };
  const repo = createAccountProvisioningRepository(db, protector);
  await repo.createOwnedTeam({ teamId: "team123", name: "熊本ジュニア", passphraseHash: "hash1", adminHash: "hash2", userId: "u1" });
  const teamInsert = bound.find((entry) => entry.sql.includes("INSERT INTO teams"));
  assert.ok(teamInsert);
  assert.match(teamInsert.params[1], /^enc:v1:/);
  assert.equal(await protector.decrypt(teamInsert.params[1], "teams.name"), "熊本ジュニア");
});

test("owned team names are decrypted at the repository boundary", async () => {
  const encryptedName = await protector.encrypt("熊本ジュニア", "teams.name");
  const db = {
    prepare() {
      return { bind() { return { async all() { return { results: [{ id: "team123", name: encryptedName, status: "active" }] }; } }; } };
    }
  };
  const repo = createAdminMembershipRepository(db, protector);
  const teams = await repo.ownedTeams("u1");
  assert.equal(teams[0].name, "熊本ジュニア");
});
