import { cleanName, isAdminCredential, normalizeSecret, randomId, teamUrls } from "../validation/common.js";
import { ServiceError } from "./errors.js";

export function createSystemTeamService({ teamRepository, auditRepository, hashPassword, createId = () => randomId(10) }) {
  return {
    async list() {
      return teamRepository.listWithCounts();
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
      await teamRepository.updateFromSystem({
        teamId,
        name,
        status,
        passphraseHash,
        adminHash,
        invalidatePlayer: Boolean(nextPassphrase) || statusChanged,
        invalidateAdmin: Boolean(nextAdminPassword) || statusChanged
      });
      await auditRepository.record("system", null, "team.update", "team", teamId, {
        status,
        passphraseChanged: Boolean(nextPassphrase),
        adminPasswordChanged: Boolean(nextAdminPassword)
      });
      return teamRepository.publicTeam(await teamRepository.findById(teamId));
    },

    async remove(teamId) {
      const team = await teamRepository.findById(teamId);
      if (!team) throw new ServiceError("team_not_found", "", 404);
      await teamRepository.softDelete(teamId);
      await auditRepository.record("system", null, "team.soft_delete", "team", teamId, { name: team.name });
      return { ok: true };
    }
  };
}
