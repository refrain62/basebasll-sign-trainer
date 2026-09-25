export interface D1StatementLike {
  bind(...values: unknown[]): D1StatementLike;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  all<T = Record<string, unknown>>(): Promise<{ results?: T[] }>;
  run(): Promise<{ success?: boolean; meta?: { changes?: number; last_row_id?: number | string } }>;
}

export interface D1DatabaseLike {
  prepare(sql: string): D1StatementLike;
  batch<T = unknown>(statements: D1StatementLike[]): Promise<T[]>;
}

export interface AssetFetcherLike {
  fetch(input: Request | string | URL, init?: RequestInit): Promise<Response>;
}

export interface WorkerBindings {
  DB: D1DatabaseLike;
  ASSETS: AssetFetcherLike;
  ENVIRONMENT?: string;
  SESSION_SECRET: string;
  SYSTEM_ADMIN_SECRET: string;
  PASSWORD_PEPPER: string;
  DATA_ENCRYPTION_KEY: string;
  DATA_LOOKUP_KEY: string;
  SESSION_DAYS?: string | number;
  ADMIN_SESSION_HOURS?: string | number;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  LINE_CHANNEL_ID?: string;
  LINE_CHANNEL_SECRET?: string;
  PUBLIC_OPERATOR_NAME?: string;
  PUBLIC_SUPPORT_URL?: string;
  REQUIRE_CF_ACCESS_FOR_SYSTEM_ADMIN?: string | boolean;
  CF_ACCESS_TEAM_DOMAIN?: string;
  CF_ACCESS_POLICY_AUD?: string;
  SYSTEM_ADMIN_ALLOWED_EMAILS?: string;
  CF_VERSION_METADATA?: { id?: string; tag?: string };
  [key: string]: unknown;
}

export type AppEnv = { Bindings: WorkerBindings };
