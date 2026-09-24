import { cleanName, isAdminCredential, normalizeSecret } from "../validation/common.js";
import { ServiceError } from "./errors.js";

export function createTeamService({ teamRepository, auditRepository, hashPassword }) {
  return {
    async updateFromTeamAdmin(teamId, input, { canChangeAdminPassword = false } = {}) {
      const team = await teamRepository.findById(teamId);
      if (!team) throw new ServiceError("team_not_found", "", 404);
      const name = input?.name === undefined ? team.name : cleanName(input.name, 80);
      if (!name) throw new ServiceError("invalid_name", "チーム名を入力してください。", 400);

      const nextPassphrase = normalizeSecret(input?.passphrase);
      const nextAdminPassword = normalizeSecret(input?.adminPassword);
      if (nextPassphrase.length > 200 || nextAdminPassword.length > 200) {
        throw new ServiceError("secret_too_long", "合言葉・パスワードは200文字以内にしてください。", 400);
      }
      if (nextAdminPassword && !canChangeAdminPassword) {
        throw new ServiceError("owner_required_for_admin_password", "旧管理者パスワードの変更はチームオーナーのみ実行できます。", 403);
      }
      if (nextAdminPassword && !isAdminCredential(nextAdminPassword)) {
        throw new ServiceError("weak_admin_password", "管理者パスワードは12文字以上で、英字と数字をそれぞれ1文字以上含めてください。", 400);
      }

      const passphraseHash = nextPassphrase ? await hashPassword(nextPassphrase) : team.passphrase_hash;
      const adminHash = nextAdminPassword ? await hashPassword(nextAdminPassword) : team.admin_password_hash;
      await teamRepository.updateFromTeamAdmin({
        teamId,
        name,
        passphraseHash,
        adminHash,
        passphraseChanged: Boolean(nextPassphrase),
        adminPasswordChanged: Boolean(nextAdminPassword)
      });
      await auditRepository.record("team-admin", teamId, "team.update", "team", teamId, {
        passphraseChanged: Boolean(nextPassphrase),
        adminPasswordChanged: Boolean(nextAdminPassword)
      });
      return teamRepository.publicTeam(await teamRepository.findById(teamId));
    }
  };
}
