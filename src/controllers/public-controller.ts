import { publicLegalConfig } from "../config/legal.ts";
import { apiJson } from "../http/response.ts";
import { createSystemNoticeRepository } from "../repositories/system-notice-repository.ts";

export function publicLegal(_request, env) {
  return apiJson(publicLegalConfig(env));
}

export async function publicSystemNotices(_request, env) {
  const notices = await createSystemNoticeRepository(env.DB).listPublished();
  return apiJson({ notices });
}
