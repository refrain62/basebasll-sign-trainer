import { cleanComment, cleanName, parseYouTubeUrl } from "../validation/common.ts";
import { ServiceError } from "./errors.ts";

export function createSignService({ signRepository, groupRepository, videoRepository, auditRepository }) {
  return {
    async create(teamId, input, auditActor = null, { maxItems = null, planName = "現在のプラン" } = {}) {
      const name = cleanName(input?.name, 80);
      if (!name) throw new ServiceError("invalid_name", "サイン名を入力してください。", 400);
      const groupId = await groupRepository.validId(teamId, input?.groupId);
      const sortOrder = await signRepository.nextSortOrder(teamId);
      const createInput: any = { teamId, name, sortOrder, groupId };
      if (maxItems !== null && maxItems !== undefined) createInput.maxItems = maxItems;
      const signId = await signRepository.create(createInput);
      if (signId === null) {
        throw new ServiceError("plan_limit_reached", `${planName}ではサイン登録は最大${maxItems}個までです。`, 403, { feature: "sign_count", limit: maxItems });
      }
      if (input?.youtubeUrl) {
        const parsed = parseYouTubeUrl(input.youtubeUrl);
        if (!parsed) {
          await signRepository.hardDelete(teamId, signId);
          throw new ServiceError("invalid_youtube", "YouTube URLを確認してください。", 400);
        }
        await videoRepository.create({ signId, youtubeUrl: parsed.url, videoId: parsed.videoId, sortOrder: 10, comment: cleanComment(input?.videoComment), thumbnailTimeSeconds: 0 });
      }
      await auditRepository.record(auditActor?.role || "team-admin", teamId, "sign.create", "sign", signId, { name }, auditActor?.userId || null);
      return signRepository.getWithVideos(teamId, signId);
    },

    async update(teamId, signId, input, auditActor = null) {
      const sign = await signRepository.findById(teamId, signId);
      if (!sign) throw new ServiceError("not_found", "", 404);
      const name = input?.name === undefined ? sign.name : cleanName(input.name, 80);
      if (!name) throw new ServiceError("invalid_name", "サイン名を入力してください。", 400);
      const sortOrder = Number.isFinite(Number(input?.sortOrder)) ? Math.trunc(Number(input.sortOrder)) : sign.sort_order;
      const enabled = input?.enabled === undefined ? sign.enabled : (input.enabled ? 1 : 0);
      const groupId = input?.groupId === undefined ? sign.group_id : await groupRepository.validId(teamId, input.groupId);
      await signRepository.update({ teamId, signId, name, sortOrder, enabled, groupId });
      await auditRepository.record(auditActor?.role || "team-admin", teamId, "sign.update", "sign", signId, { name, enabled: Boolean(enabled), sortOrder }, auditActor?.userId || null);
      return signRepository.getWithVideos(teamId, signId);
    },

    async remove(teamId, signId, auditActor = null) {
      const sign = await signRepository.findById(teamId, signId);
      if (!sign) throw new ServiceError("not_found", "", 404);
      await signRepository.softDelete(teamId, signId);
      await auditRepository.record(auditActor?.role || "team-admin", teamId, "sign.soft_delete", "sign", signId, null, auditActor?.userId || null);
      return { ok: true };
    }
  };
}
