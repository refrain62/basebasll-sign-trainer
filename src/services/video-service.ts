import { cleanComment, parseYouTubeUrl } from "../validation/common.ts";
import { ServiceError } from "./errors.ts";

export function createVideoService({ signRepository, videoRepository, auditRepository }) {
  return {
    async create(teamId, signId, input, auditActor = null) {
      const sign = await signRepository.findById(teamId, signId);
      if (!sign) throw new ServiceError("not_found", "", 404);
      const parsed = parseYouTubeUrl(input?.youtubeUrl);
      if (!parsed) throw new ServiceError("invalid_youtube", "YouTube URLを確認してください。", 400);
      const sortOrder = await videoRepository.nextSortOrder(signId);
      const thumbnailTimeSeconds = Math.max(0, Math.trunc(Number(input?.thumbnailTimeSeconds) || 0));
      const videoId = await videoRepository.create({ signId, youtubeUrl: parsed.url, videoId: parsed.videoId, sortOrder, comment: cleanComment(input?.comment), thumbnailTimeSeconds });
      await auditRepository.record(auditActor?.role || "team-admin", teamId, "video.create", "video", videoId, { signId }, auditActor?.userId || null);
      return { videoId, sign: await signRepository.getWithVideos(teamId, signId) };
    },

    async update(teamId, id, input, auditActor = null) {
      const video = await videoRepository.findById(teamId, id);
      if (!video) throw new ServiceError("not_found", "", 404);
      let youtubeUrl = video.youtube_url;
      let videoId = video.youtube_video_id;
      if (input?.youtubeUrl !== undefined) {
        const parsed = parseYouTubeUrl(input.youtubeUrl);
        if (!parsed) throw new ServiceError("invalid_youtube", "YouTube URLを確認してください。", 400);
        youtubeUrl = parsed.url;
        videoId = parsed.videoId;
      }
      const sortOrder = Number.isFinite(Number(input?.sortOrder)) ? Math.trunc(Number(input.sortOrder)) : video.sort_order;
      const enabled = input?.enabled === undefined ? video.enabled : (input.enabled ? 1 : 0);
      const comment = input?.comment === undefined ? String(video.comment || "") : cleanComment(input.comment);
      const thumbnailTimeSeconds = input?.thumbnailTimeSeconds === undefined ? Math.max(0, Math.trunc(Number(video.thumbnail_time_seconds) || 0)) : Math.max(0, Math.trunc(Number(input.thumbnailTimeSeconds) || 0));
      await videoRepository.update({ id, youtubeUrl, videoId, sortOrder, enabled, comment, thumbnailTimeSeconds });
      await auditRepository.record(auditActor?.role || "team-admin", teamId, "video.update", "video", id, { signId: video.sign_id, enabled: Boolean(enabled), sortOrder, comment, thumbnailTimeSeconds }, auditActor?.userId || null);
      return signRepository.getWithVideos(teamId, video.sign_id);
    },

    async remove(teamId, id, auditActor = null) {
      const video = await videoRepository.findById(teamId, id);
      if (!video) throw new ServiceError("not_found", "", 404);
      await videoRepository.softDelete(id);
      await auditRepository.record(auditActor?.role || "team-admin", teamId, "video.soft_delete", "video", id, { signId: video.sign_id }, auditActor?.userId || null);
      return signRepository.getWithVideos(teamId, video.sign_id);
    }
  };
}
