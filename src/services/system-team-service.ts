import { cleanName, isAdminCredential, normalizeSecret, randomId, teamUrls } from "../validation/common.ts";
import { ServiceError } from "./errors.ts";

export function createSystemTeamService({ teamRepository, auditRepository, hashPassword, entitlementService = null, createId = () => randomId(10) }) {
  return {
    async list() {
      const teams = await teamRepository.listWithCounts();
      if (!entitlementService) return teams;
      const plans = await entitlementService.planSummaries(teams.map((team) => team.id));
      return teams.map((team) => ({ ...team, plan: plans[team.id] || null }));
    },

    async create(input) {
      const name = cleanName(input?.name, 80);
      const passphrase = normalizeSecret(input?.passphrase);
      const adminPassword = normalizeSecret(input?.adminPassword);
      if (!name || !passphrase || !adminPassword) {
        throw new ServiceError("invalid_request", "チーム名・選手用合言葉・管理者パスワードを入力してください。", 400);
      }
      if (passphrase.length > 200 || adminPassword.length > 200) {
        throw new ServiceError("secret_too_long", "合言葉・パスワードは200文字以内にしてください。", 400);
      }
      if (!isAdminCredential(adminPassword)) {
        throw new ServiceError("weak_admin_password", "管理者パスワードは12文字以上で、英字と数字をそれぞれ1文字以上含めてください。", 400);
      }

      let teamId = "";
      for (let attempt = 0; attempt < 8; attempt += 1) {
        const candidate = createId();
        if (!(await teamRepository.idExists(candidate))) {
          teamId = candidate;
          break;
        }
      }
      if (!teamId) throw new ServiceError("id_generation_failed", "", 500);

      const passphraseHash = await hashPassword(passphrase);
      const adminHash = await hashPassword(adminPassword);
      await teamRepository.create({ teamId, name, passphraseHash, adminHash });
      await auditRepository.record("system", null, "team.create", "team", teamId, { name });
      return {
        team: teamRepository.publicTeam(await teamRepository.findById(teamId)),
        urls: teamUrls(teamId)
      };
    },

    async update(teamId, input) {
      const team = await teamRepository.findById(teamId);
      if (!team) throw new ServiceError("team_not_found", "", 404);
      const name = input?.name === undefined ? team.name : cleanName(input.name, 80);
      const status = input?.status === undefined ? team.status : String(input.status);
      if (!name || !["active", "suspended"].includes(status)) throw new ServiceError("invalid_request", "", 400);

      const nextPassphrase = normalizeSecret(input?.passphrase);
      const nextAdminPassword = normalizeSecret(input?.adminPassword);
      if (nextPassphrase.length > 200 || nextAdminPassword.length > 200) {
        throw new ServiceError("secret_too_long", "合言葉・パスワードは200文字以内にしてください。", 400);
      }
      if (nextAdminPassword && !isAdminCredential(nextAdminPassword)) {
        throw new ServiceError("weak_admin_password", "管理者パスワードは12文字以上で、英字と数字をそれぞれ1文字以上含めてください。", 400);
      }

      const passphraseHash = nextPassphrase ? await hashPassword(nextPassphrase) : team.passphrase_hash;
      const adminHash = nextAdminPassword ? await hashPassword(nextAdminPassword) : team.admin_password_hash;
      const statusChanged = status !== team.status;
      const requestedPlanCode = input?.planCode ? String(input.planCode) : "";
      const previousPlan = requestedPlanCode && entitlementService ? (await entitlementService.summary(teamId)).plan : null;
      await teamRepository.updateFromSystem({
        teamId,
        name,
        status,
        passphraseHash,
        adminHash,
        invalidatePlayer: Boolean(nextPassphrase) || statusChanged,
        invalidateAdmin: Boolean(nextAdminPassword) || statusChanged
      });
      let planChange = null;
      if (requestedPlanCode && entitlementService && requestedPlanCode !== previousPlan?.code) {
        planChange = await entitlementService.assignSystemPlan(teamId, requestedPlanCode);
      }
      await auditRepository.record("system", null, "team.update", "team", teamId, {
        status,
        passphraseChanged: Boolean(nextPassphrase),
        adminPasswordChanged: Boolean(nextAdminPassword),
        planChanged: Boolean(planChange),
        previousPlanCode: planChange?.previous?.code || previousPlan?.code || null,
        planCode: planChange?.current?.code || previousPlan?.code || null
      });
      if (planChange) {
        await auditRepository.record("system", teamId, "plan.change", "team", teamId, {
          previousPlanCode: planChange.previous?.code || null,
          planCode: planChange.current?.code || requestedPlanCode,
          source: "system_manual_provisioning"
        });
      }
      const updated = teamRepository.publicTeam(await teamRepository.findById(teamId));
      return entitlementService ? { ...updated, plan: (await entitlementService.summary(teamId)).plan } : updated;
    },

    async remove(teamId) {
      const team = await teamRepository.findById(teamId);
      if (!team) throw new ServiceError("team_not_found", "", 404);
      await teamRepository.softDelete(teamId);
      await auditRepository.record("system", null, "team.withdraw", "team", teamId, { name: team.name, source: "system" });
      return { ok: true };
    },

    async restore(teamId) {
      const team = await teamRepository.findAnyById(teamId);
      if (!team) throw new ServiceError("team_not_found", "", 404);
      if (!team.deleted_at) throw new ServiceError("team_not_deleted", "このチームは退会済みではありません。", 409);
      await teamRepository.restore(teamId);
      await auditRepository.record("system", null, "team.restore", "team", teamId, { name: team.name });
      return teamRepository.publicTeam(await teamRepository.findById(teamId));
    }
  };
}
