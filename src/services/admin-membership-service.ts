import { randomId } from "../validation/common.ts";
import { randomToken, sha256Token } from "../security/tokens.ts";
import { ServiceError } from "./errors.ts";
import { MAX_SUB_ADMINS } from "../config/constants.ts";

export function createAdminMembershipService({
  membershipRepository,
  inviteRepository,
  transitionRepository,
  teamRepository,
  auditRepository,
  createInviteId = () => `inv_${randomId(16)}`,
  createRawToken = () => randomToken(32),
  now = () => Math.floor(Date.now() / 1000)
}) {
  async function membership(teamId, userId) {
    return membershipRepository.find(teamId, userId);
  }
  async function requireOwner(teamId, userId) {
    const row = await membership(teamId, userId);
    if (!row || row.role !== "owner") throw new ServiceError("owner_required", "この操作はメイン管理者のみ実行できます。", 403);
    return row;
  }
  async function subAdminCount(teamId) {
    return membershipRepository.countByRole(teamId, "admin");
  }
  function subAdminLimitError() {
    return new ServiceError("sub_admin_limit_reached", `サブ管理者は最大${MAX_SUB_ADMINS}名までです。既存のサブ管理者を外すか、承認待ちの招待を取り消してから追加してください。`, 409, { maxSubAdmins: MAX_SUB_ADMINS });
  }
  async function inviteByToken(rawToken) {
    const tokenHash = await sha256Token(rawToken);
    const invite = await inviteRepository.findByTokenHash(tokenHash);
    if (!invite) throw new ServiceError("invite_not_found", "招待リンクが見つかりません。", 404);
    if (invite.status !== "pending") throw new ServiceError("invite_used", "この招待リンクはすでに使用済みです。", 409);
    if (Number(invite.expires_at) <= now()) throw new ServiceError("invite_expired", "この招待リンクは期限切れです。", 410);
    return invite;
  }

  return {
    async management(teamId, userId) {
      const actor = await membership(teamId, userId);
      if (!actor) throw new ServiceError("unauthorized", "管理権限がありません。", 403);
      const team = await teamRepository.findById(teamId);
      if (!team) throw new ServiceError("team_not_found", "チームが見つかりません。", 404);
      const members = await membershipRepository.listForTeam(teamId);
      const pendingInvites = actor.role === "owner" ? await inviteRepository.listPending(teamId, now()) : [];
      const subAdminCountValue = members.filter((member) => member.role === "admin").length;
      const pendingSubAdminInvites = pendingInvites.filter((invite) => invite.kind === "admin").length;
      const reservedSubAdminSlots = Math.min(MAX_SUB_ADMINS, subAdminCountValue + pendingSubAdminInvites);
      return {
        currentRole: actor.role,
        members,
        pendingInvites,
        legacyPasswordEnabled: Boolean(team.admin_password_enabled),
        maxSubAdmins: MAX_SUB_ADMINS,
        subAdminCount: subAdminCountValue,
        pendingSubAdminInvites,
        subAdminSlotsRemaining: Math.max(0, MAX_SUB_ADMINS - reservedSubAdminSlots),
        canInviteSubAdmin: reservedSubAdminSlots < MAX_SUB_ADMINS
      };
    },

    async claimLegacyTeam(teamId, userId) {
      const team = await teamRepository.findById(teamId);
      if (!team) throw new ServiceError("team_not_found", "チームが見つかりません。", 404);
      const current = await membershipRepository.find(teamId, userId);
      if (current) {
        if (current.role === "owner" && team.admin_password_enabled) await teamRepository.disableAdminPassword(teamId);
        return membershipRepository.find(teamId, userId);
      }
      if (await membershipRepository.hasAny(teamId)) throw new ServiceError("team_already_claimed", "このチームにはすでにアカウント管理者が設定されています。", 409);
      const claimed = await transitionRepository.claimLegacyTeam({ teamId, userId });
      if (!claimed) throw new ServiceError("team_already_claimed", "このチームにはすでにアカウント管理者が設定されています。", 409);
      await auditRepository.record("account-owner", teamId, "team.claim", "team", teamId, { userId, legacyPasswordDisabled: true });
      return membershipRepository.find(teamId, userId);
    },

    async createInvite(teamId, userId, input) {
      await requireOwner(teamId, userId);
      const pending = await inviteRepository.listPending(teamId, now());
      if (pending.length >= 10) throw new ServiceError("too_many_pending_invites", "承認待ちの招待が多すぎます。不要な招待を取り消してから発行してください。", 409);
      const kind = input?.kind === "transfer" ? "transfer" : "admin";
      const creatorExit = kind === "transfer" && Boolean(input?.creatorExit);
      const activeSubAdmins = await subAdminCount(teamId);
      if (kind === "admin") {
        const pendingSubAdmins = pending.filter((invite) => invite.kind === "admin").length;
        if (activeSubAdmins + pendingSubAdmins >= MAX_SUB_ADMINS) throw subAdminLimitError();
      } else if (!creatorExit && activeSubAdmins >= MAX_SUB_ADMINS) {
        throw new ServiceError("sub_admin_limit_transfer", `現在サブ管理者が${MAX_SUB_ADMINS}名いるため、メイン管理者が残る形では交代できません。「交代後、自分は外れる」を選ぶか、先にサブ管理者を減らしてください。`, 409, { maxSubAdmins: MAX_SUB_ADMINS });
      }
      const requestedHours = Number(input?.expiresHours || 24);
      const expiresHours = Number.isFinite(requestedHours) ? Math.max(1, Math.min(72, Math.trunc(requestedHours))) : 24;
      const rawToken = createRawToken();
      const inviteId = createInviteId();
      const expiresAt = now() + expiresHours * 3600;
      await inviteRepository.create({
        id: inviteId,
        teamId,
        createdByUserId: userId,
        kind,
        tokenHash: await sha256Token(rawToken),
        creatorExit,
        expiresAt
      });
      await auditRepository.record("account-owner", teamId, "admin.invite.create", "admin-invite", inviteId, { kind, creatorExit, expiresAt });
      return { inviteId, rawToken, kind, creatorExit, expiresAt };
    },

    async previewInvite(rawToken) {
      const invite = await inviteByToken(rawToken);
      return {
        teamId: invite.team_id,
        teamName: invite.team_name,
        kind: invite.kind,
        creatorName: invite.creator_name,
        creatorExit: Boolean(invite.creator_exit),
        expiresAt: Number(invite.expires_at)
      };
    },

    async acceptInvite(rawToken, userId) {
      const invite = await inviteByToken(rawToken);
      if (invite.created_by_user_id === userId) throw new ServiceError("cannot_accept_own_invite", "自分で発行した招待リンクは自分では承認できません。", 400);
      const owner = await membershipRepository.find(invite.team_id, invite.created_by_user_id);
      if (!owner || owner.role !== "owner") throw new ServiceError("owner_changed", "招待作成後にメイン管理者が変更されています。新しい招待リンクを作成してください。", 409);
      let accepted = false;
      if (invite.kind === "admin") {
        const existing = await membershipRepository.find(invite.team_id, userId);
        if (!existing && await subAdminCount(invite.team_id) >= MAX_SUB_ADMINS) throw subAdminLimitError();
        try {
          accepted = await transitionRepository.acceptAdminInvite({ inviteId: invite.id, teamId: invite.team_id, userId, maxSubAdmins: MAX_SUB_ADMINS });
        } catch (error) {
          if (String(error?.message || error).includes("sub_admin_limit_reached")) throw subAdminLimitError();
          throw error;
        }
      } else {
        const targetMembership = await membershipRepository.find(invite.team_id, userId);
        if (!invite.creator_exit && targetMembership?.role !== "admin" && await subAdminCount(invite.team_id) >= MAX_SUB_ADMINS) {
          throw new ServiceError("sub_admin_limit_transfer", `現在サブ管理者が${MAX_SUB_ADMINS}名いるため、メイン管理者が残る形では交代できません。`, 409, { maxSubAdmins: MAX_SUB_ADMINS });
        }
        accepted = await transitionRepository.acceptTransferInvite({
          inviteId: invite.id,
          teamId: invite.team_id,
          currentOwnerUserId: invite.created_by_user_id,
          nextOwnerUserId: userId,
          currentOwnerExit: Boolean(invite.creator_exit),
          maxSubAdmins: MAX_SUB_ADMINS
        });
      }
      if (!accepted) throw new ServiceError("invite_used", "この招待リンクはすでに使用済みです。", 409);
      await auditRepository.record("account", invite.team_id, invite.kind === "transfer" ? "owner.transfer.accept" : "admin.invite.accept", "user", userId, { inviteId: invite.id });
      return { teamId: invite.team_id, kind: invite.kind };
    },

    async transferToExisting(teamId, currentOwnerUserId, nextOwnerUserId, currentOwnerExit) {
      await requireOwner(teamId, currentOwnerUserId);
      if (currentOwnerUserId === nextOwnerUserId) throw new ServiceError("cannot_transfer_to_self", "自分自身へ交代することはできません。", 400);
      const target = await membershipRepository.find(teamId, nextOwnerUserId);
      if (!target || target.role !== "admin") throw new ServiceError("target_admin_required", "交代先は現在の管理者から選んでください。", 400);
      const transferred = await transitionRepository.transferToExisting({ teamId, currentOwnerUserId, nextOwnerUserId, currentOwnerExit: Boolean(currentOwnerExit) });
      if (!transferred) throw new ServiceError("owner_changed", "メイン管理者情報が更新されています。画面を再読み込みしてもう一度お試しください。", 409);
      await auditRepository.record("account-owner", teamId, "owner.transfer", "user", nextOwnerUserId, { previousOwner: currentOwnerUserId, previousOwnerExit: Boolean(currentOwnerExit) });
      return { ok: true };
    },

    async removeAdmin(teamId, ownerUserId, targetUserId) {
      await requireOwner(teamId, ownerUserId);
      const target = await membershipRepository.find(teamId, targetUserId);
      if (!target) throw new ServiceError("admin_not_found", "管理者が見つかりません。", 404);
      if (target.role === "owner") throw new ServiceError("cannot_remove_owner", "メイン管理者は削除できません。先にメイン管理者を交代してください。", 409);
      await membershipRepository.remove(teamId, targetUserId);
      await auditRepository.record("account-owner", teamId, "admin.remove", "user", targetUserId);
      return { ok: true };
    },

    async leaveTeam(teamId, userId) {
      const current = await membershipRepository.find(teamId, userId);
      if (!current) throw new ServiceError("membership_not_found", "このチームの管理者ではありません。", 404);
      if (current.role === "owner") throw new ServiceError("owner_cannot_leave", "メイン管理者はそのまま退会できません。先にメイン管理者を交代してください。", 409);
      await membershipRepository.remove(teamId, userId);
      await auditRepository.record("account", teamId, "admin.leave", "user", userId);
      return { ok: true };
    },

    async disableLegacyPassword(teamId, userId) {
      await requireOwner(teamId, userId);
      await teamRepository.disableAdminPassword(teamId);
      await auditRepository.record("account-owner", teamId, "legacy_admin_password.disable", "team", teamId);
      return { ok: true };
    },

    async revokeInvite(teamId, userId, inviteId) {
      await requireOwner(teamId, userId);
      await inviteRepository.revoke(inviteId, teamId);
      await auditRepository.record("account-owner", teamId, "admin.invite.revoke", "admin-invite", inviteId);
      return { ok: true };
    }
  };
}
