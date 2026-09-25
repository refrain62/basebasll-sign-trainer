const SENSITIVE_KEY = /(name|email|comment|url|passphrase|password|secret|token|subject|avatar|description)/i;

function sanitizeValue(value, depth = 0) {
  if (depth > 6) return "[truncated]";
  if (Array.isArray(value)) return value.slice(0, 50).map((item) => sanitizeValue(item, depth + 1));
  if (!value || typeof value !== "object") return value;
  const output = {};
  for (const [key, child] of Object.entries(value)) {
    if (SENSITIVE_KEY.test(key)) output[key] = child === null || child === undefined || child === "" ? child : "[redacted]";
    else output[key] = sanitizeValue(child, depth + 1);
  }
  return output;
}

export function sanitizeAuditDetail(detail) {
  return detail == null ? null : sanitizeValue(detail);
}
