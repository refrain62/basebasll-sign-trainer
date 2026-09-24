export class ServiceError extends Error {
  constructor(code, message, status = 400) {
    super(message || code);
    this.name = "ServiceError";
    this.code = code;
    this.status = status;
  }
}
