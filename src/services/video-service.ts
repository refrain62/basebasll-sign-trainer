import { cleanComment, parseYouTubeUrl } from "../validation/common.ts";
import { ServiceError } from "./errors.ts";

export function createVideoService({ signRepository, videoRepository, auditRepository }) {
  return {
    async create(teamId, signId, input) {
      const sign = await signRepository.findById(teamId, signId);
      if (!sign) throw new ServiceError("not_found", "", 404);
      const parsed = parseYouTubeUrl(input?.youtubeUrl);
      if (!parsed) throw new ServiceError("invalid_youtube", "YouTube URLを確認してください。", 400);
      const sortOrder = await videoRepository.nextSortOrder(signId);
      const videoId = await videoRepository.create({ signId, youtubeUrl: parsed.url, videoId: parsed.videoId, sortOrder, comment: cleanComment(input?.comment) });
      await auditRepository.record("team-admin", teamId, "video.create", "video", videoId, { signId });
      return { videoId, sign: await signRepository.getWithVideos(teamId, signId) };
    },

    async update(teamId, id, input) {
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
      await videoRepository.update({ id, youtubeUrl, videoId, sortOrder, enabled, comment });
      await auditRepository.record("team-admin", teamId, "video.update", "video", id, { signId: video.sign_id, enabled: Boolean(enabled), sortOrder, comment });
      return signRepository.getWithVideos(teamId, video.sign_id);
    },

    async remove(teamId, id) {
      const video = await videoRepository.findById(teamId, id);
      if (!video) throw new ServiceError("not_found", "", 404);
      await videoRepository.softDelete(id);
      await auditRepository.record("team-admin", teamId, "video.soft_delete", "video", id, { signId: video.sign_id });
      return signRepository.getWithVideos(teamId, video.sign_id);
    }
  };
}
