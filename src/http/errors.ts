import { apiJson } from "./response.ts";
import { ServiceError } from "../services/errors.ts";

export function serviceErrorResponse(error: unknown): Response {
  if (!(error instanceof ServiceError)) throw error;
  const body: { error: string; message?: string } = { error: error.code };
  if (error.message && error.message !== error.code) body.message = error.message;
  return apiJson(body, error.status || 400);
}
