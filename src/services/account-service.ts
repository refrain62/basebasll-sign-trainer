import { cleanName, normalizeSecret, randomId, teamUrls } from "../validation/common.ts";
import { randomToken } from "../security/tokens.ts";
import { ServiceError } from "./errors.ts";

export function createAccountService({
  userRepository,
  membershipRepository,
  teamRepository,
  provisioningRepository,
  auditRepository,
  hashPassword,
  entitlementService = null,
  createUserId = () => `u_${randomId(18)}`,
  createTeamId = () => randomId(10)
}) {
  return {
    async upsertOAuthUser(profile, legalConsent = null) {
      if (!profile?.provider || !profile?.subject) throw new ServiceError("invalid_identity", "認証情報を確認できませんでした。", 400);
      const existing = await userRepository.findByIdentity(profile.provider, profile.subject);
      if (existing) {
        const user = await userRepository.updateFromIdentity({
          userId: existing.id,
          provider: profile.provider,
          subject: profile.subject,
          email: profile.email,
          emailVerified: profile.emailVerified,
          displayName: profile.displayName,
          avatarUrl: profile.avatarUrl
        });
        if (legalConsent?.termsVersion && legalConsent?.privacyVersion) await userRepository.recordLegalConsent(existing.id, legalConsent.termsVersion, legalConsent.privacyVersion);
        return userRepository.publicUser(user);
      }

      let userId = "";
      for (let attempt = 0; attempt < 8; attempt += 1) {
        const candidate = createUserId();
        if (!(await userRepository.findById(candidate))) { userId = candidate; break; }
      }
      if (!userId) throw new ServiceError("id_generation_failed", "アカウントを作成できませんでした。", 500);
      const displayName = cleanName(profile.displayName || "管理者", 120) || "管理者";
      try {
        await userRepository.createWithIdentity({
          userId,
          displayName,
          email: profile.email || "",
          avatarUrl: profile.avatarUrl || "",
          provider: profile.provider,
          subject: profile.subject,
          emailVerified: Boolean(profile.emailVerified)
        });
        await auditRepository.record("account", null, "account.create", "user", userId, { provider: profile.provider });
        if (legalConsent?.termsVersion && legalConsent?.privacyVersion) await userRepository.recordLegalConsent(userId, legalConsent.termsVersion, legalConsent.privacyVersion);
        return userRepository.publicUser(await userRepository.findById(userId));
      } catch (error) {
        // A second callback for the same provider identity may win the UNIQUE race.
        // Reuse that account rather than leaving a duplicate account behind.
        const raced = await userRepository.findByIdentity(profile.provider, profile.subject);
        if (!raced) throw error;
        const user = await userRepository.updateFromIdentity({
          userId: raced.id,
          provider: profile.provider,
          subject: profile.subject,
          email: profile.email,
          emailVerified: profile.emailVerified,
          displayName: profile.displayName,
          avatarUrl: profile.avatarUrl
        });
        if (legalConsent?.termsVersion && legalConsent?.privacyVersion) await userRepository.recordLegalConsent(raced.id, legalConsent.termsVersion, legalConsent.privacyVersion);
        return userRepository.publicUser(user);
      }
    },

    async dashboard(userId) {
      const row = await userRepository.findById(userId);
      if (!row) throw new ServiceError("account_not_found", "アカウントが見つかりません。", 404);
      const teams = await membershipRepository.listForUser(userId);
      const plans = entitlementService ? await entitlementService.planSummaries(teams.map((team) => team.teamId)) : {};
      return {
        user: userRepository.publicUser(row),
        identities: await userRepository.listIdentities(userId),
        teams: teams.map((team) => ({ ...team, plan: plans[team.teamId] || null }))
      };
    },

    async assertLegalConsent(userId, termsVersion, privacyVersion) {
      const user = await userRepository.findById(userId);
      if (!user) throw new ServiceError("account_not_found", "アカウントが見つかりません。", 404);
      if (String(user.terms_version || "") !== String(termsVersion || "") || String(user.privacy_version || "") !== String(privacyVersion || "") || !user.legal_accepted_at) {
        throw new ServiceError("legal_consent_required", "利用規約とプライバシーポリシーの最新版への同意が必要です。", 428);
      }
      return true;
    },

    async createTeam(userId, input) {
      const user = await userRepository.findById(userId);
      if (!user) throw new ServiceError("account_not_found", "アカウントが見つかりません。", 404);
      const name = cleanName(input?.name, 80);
      const passphrase = normalizeSecret(input?.passphrase);
      if (!name || !passphrase) throw new ServiceError("invalid_request", "チーム名と選手用合言葉を入力してください。", 400);
      if (passphrase.length > 200) throw new ServiceError("secret_too_long", "合言葉は200文字以内にしてください。", 400);

      let teamId = "";
      for (let attempt = 0; attempt < 8; attempt += 1) {
        const candidate = createTeamId();
        if (!(await teamRepository.idExists(candidate))) { teamId = candidate; break; }
      }
      if (!teamId) throw new ServiceError("id_generation_failed", "チームIDを作成できませんでした。", 500);
      const passphraseHash = await hashPassword(passphrase);
      const adminHash = await hashPassword(randomToken(48));
      await provisioningRepository.createOwnedTeam({ teamId, name, passphraseHash, adminHash, userId });
      await auditRepository.record("account-owner", teamId, "team.self_register", "team", teamId, { userId, name });
      return { team: teamRepository.publicTeam(await teamRepository.findById(teamId)), urls: teamUrls(teamId) };
    },

    async assertAccountDeletable(userId) {
      const user = await userRepository.findById(userId);
      if (!user) throw new ServiceError("account_not_found", "アカウントが見つかりません。", 404);
      const owned = await membershipRepository.ownedTeams(userId);
      if (owned.length) {
        throw new ServiceError("owned_teams_remaining", "メイン管理者になっているチームがあります。先にメイン管理者を交代してください。", 409, { teams: owned.map((team) => ({ id: team.id, name: team.name })) });
      }
      return { identities: await userRepository.listIdentities(userId) };
    },

    async deleteAccount(userId) {
      const user = await userRepository.findById(userId);
      if (!user) throw new ServiceError("account_not_found", "アカウントが見つかりません。", 404);
      const owned = await membershipRepository.ownedTeams(userId);
      if (owned.length) {
        throw new ServiceError("owned_teams_remaining", "メイン管理者になっているチームがあります。先にメイン管理者を交代してください。", 409, { teams: owned.map((team) => ({ id: team.id, name: team.name })) });
      }
      const deleted = await userRepository.softDelete(userId);
      if (!deleted) {
        const stillOwned = await membershipRepository.ownedTeams(userId);
        if (stillOwned.length) {
          throw new ServiceError("owned_teams_remaining", "メイン管理者になっているチームがあります。先にメイン管理者を交代してください。", 409, { teams: stillOwned.map((team) => ({ id: team.id, name: team.name })) });
        }
        throw new ServiceError("account_delete_conflict", "アカウントの状態が変更されました。画面を再読み込みしてもう一度お試しください。", 409);
      }
      await auditRepository.record("account", null, "account.delete", "user", userId);
      return { ok: true };
    }
  };
}
