import { Hono } from "hono";
import { expect, test } from "vitest";
import type { AppEnv } from "../../src/types.ts";
import { apiGuardMiddleware } from "../../src/middleware/api-guard.ts";
import { environmentAccessMiddleware } from "../../src/middleware/environment-access.ts";

const ENCODED_LINE_TERMINATORS = ["%0A", "%0D", "%E2%80%A8", "%E2%80%A9"];

function createSecurityRouter() {
  // Worker本体のルート構成によるTrieRouterへのfallbackに依存せず、既定SmartRouter経路を検証する。
  const app = new Hono<AppEnv>();
  app.use("*", environmentAccessMiddleware);
  app.use("/api/*", apiGuardMiddleware);
  app.get("/api/probe", (c) => c.text("handler"));
  return app;
}

test.each(ENCODED_LINE_TERMINATORS)("environment access wildcard runs for encoded line terminator %s", async (encoded) => {
  const app = createSecurityRouter();
  const response = await app.fetch(
    new Request(`https://protected.example/api/${encoded}`),
    { ENVIRONMENT: "staging", REQUIRE_CF_ACCESS_FOR_ENVIRONMENT: "true" }
  );

  expect(response.status).toBe(403);
  expect(await response.text()).toContain("protected by Cloudflare Access");
});

test.each(ENCODED_LINE_TERMINATORS)("API guard wildcard runs for encoded line terminator %s", async (encoded) => {
  const app = createSecurityRouter();
  const response = await app.fetch(
    new Request(`http://localhost/api/${encoded}`),
    { ENVIRONMENT: "production" }
  );

  expect(response.status).toBe(503);
  expect(await response.json()).toMatchObject({ error: "db_not_configured" });
});
