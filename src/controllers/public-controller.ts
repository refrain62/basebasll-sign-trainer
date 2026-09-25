import { publicLegalConfig } from "../config/legal.ts";
import { apiJson } from "../http/response.ts";

export function publicLegal(_request, env) {
  return apiJson(publicLegalConfig(env));
}
