export class ServiceError extends Error {
  code: string;
  status: number;
  details?: unknown;

  constructor(code: string, message?: string, status = 400, details: unknown = undefined) {
    super(message || code);
    this.name = "ServiceError";
    this.code = code;
    this.status = status;
    if (details !== undefined) this.details = details;
  }
}
