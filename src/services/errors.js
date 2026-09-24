export class ServiceError extends Error {
  constructor(code, message, status = 400, details = undefined) {
    super(message || code);
    this.name = "ServiceError";
    this.code = code;
    this.status = status;
    if (details !== undefined) this.details = details;
  }
}
