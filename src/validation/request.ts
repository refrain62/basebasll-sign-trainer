import type { ZodType } from "zod";
import { apiJson, safeJson } from "../http/response.ts";

export type ParsedBody<T> =
  | { data: T; response: null }
  | { data: null; response: Response };

export async function parseJsonBody<T>(request: Request, schema: ZodType<T>): Promise<ParsedBody<T>> {
  const raw = await safeJson(request);
  if (raw && typeof raw === "object" && "__error" in raw && raw.__error === "payload_too_large") {
    return { data: null, response: apiJson({ error: "payload_too_large", message: "送信内容が大きすぎます。" }, 413) };
  }
  if (raw === null) {
    return { data: null, response: apiJson({ error: "invalid_json", message: "JSON形式を確認してください。" }, 400) };
  }
  const result = schema.safeParse(raw ?? {});
  if (result.success === false) {
    return {
      data: null,
      response: apiJson({
        error: "invalid_request",
        message: "入力内容を確認してください。",
        fields: result.error.issues.slice(0, 12).map((issue) => ({
          path: issue.path.join("."),
          code: issue.code
        }))
      }, 400)
    };
  }
  return { data: result.data, response: null };
}
