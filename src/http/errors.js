import { apiJson } from "./response.js";
import { ServiceError } from "../services/errors.js";

export function serviceErrorResponse(error) {
  if (!(error instanceof ServiceError)) throw error;
  const body = { error: error.code };
  if (error.message && error.message !== error.code) body.message = error.message;
  return apiJson(body, error.status || 400);
}
