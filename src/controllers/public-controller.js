import { publicLegalConfig } from "../config/legal.js";
import { apiJson } from "../http/response.js";

export function publicLegal(_request, env) {
  return apiJson(publicLegalConfig(env));
}
