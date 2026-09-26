import { cleanName, parseYouTubeUrl } from "../validation/common.ts";
import { ServiceError } from "./errors.ts";

function explanationFromInput(value, current = { youtubeUrl: "", videoId: "" }) {
  if (value === undefined) return current;
  const raw = String(value || "").trim();
  if (!raw) return { youtubeUrl: "", videoId: "" };
  const parsed = parseYouTubeUrl(raw);
  if (!parsed) throw new ServiceError("invalid_youtube", "説明動画のYouTube URLを確認してください。", 400);
  return { youtubeUrl: parsed.url, videoId: parsed.videoId };
}

export function createGroupService({ groupRepository, auditRepository }) {
  return {
    async create(teamId, input, auditActor = null) {
      const name = cleanName(input?.name, 80);
      if (!name) throw new ServiceError("invalid_name", "グループ名を入力してください。", 400);
      const description = String(input?.description || "").trim().slice(0, 1200);
      const explanation = explanationFromInput(input?.youtubeUrl);
      const sortOrder = await groupRepository.nextSortOrder(teamId);
      const groupId = await groupRepository.create({ teamId, name, description, ...explanation, sortOrder });
      await auditRepository.record(auditActor?.role || "team-admin", teamId, "group.create", "group", groupId, { name }, auditActor?.userId || null);
      return groupRepository.getPublicById(teamId, groupId);
    },

    async update(teamId, groupId, input, auditActor = null) {
      const group = await groupRepository.findById(teamId, groupId);
      if (!group) throw new ServiceError("not_found", "", 404);
      const name = input?.name === undefined ? group.name : cleanName(input.name, 80);
      if (!name) throw new ServiceError("invalid_name", "グループ名を入力してください。", 400);
      const description = input?.description === undefined ? String(group.description || "") : String(input.description || "").trim().slice(0, 1200);
      const explanation = explanationFromInput(input?.youtubeUrl, {
        youtubeUrl: String(group.explanation_youtube_url || ""),
        videoId: String(group.explanation_youtube_video_id || "")
      });
      const sortOrder = Number.isFinite(Number(input?.sortOrder)) ? Math.trunc(Number(input.sortOrder)) : group.sort_order;
      const enabled = input?.enabled === undefined ? group.enabled : (input.enabled ? 1 : 0);
      await groupRepository.update({ teamId, groupId, name, description, ...explanation, sortOrder, enabled });
      await auditRepository.record(auditActor?.role || "team-admin", teamId, "group.update", "group", groupId, { name, enabled: Boolean(enabled), sortOrder }, auditActor?.userId || null);
      return groupRepository.getPublicById(teamId, groupId);
    },

    async remove(teamId, groupId, auditActor = null) {
      const group = await groupRepository.findById(teamId, groupId);
      if (!group) throw new ServiceError("not_found", "", 404);
      await groupRepository.softDelete(teamId, groupId);
      await auditRepository.record(auditActor?.role || "team-admin", teamId, "group.soft_delete", "group", groupId, null, auditActor?.userId || null);
      return { ok: true };
    }
  };
}
