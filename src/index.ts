import { Hono } from "hono";
import type { AppEnv } from "./types.ts";
import { NO_CACHE_ASSETS } from "./config/constants.ts";
import { apiJson, withHeaders } from "./http/response.ts";
import { pageAssetForPath, serveHtmlPage } from "./http/pages.ts";
import { isVersionedTextAsset, serveVersionedTextAsset } from "./http/versioned-assets.ts";
import { apiGuardMiddleware } from "./middleware/api-guard.ts";
import { systemAccessMiddleware } from "./middleware/system-access.ts";
import { playerRoutes } from "./routes/player.ts";
import { publicRoutes } from "./routes/public.ts";
import { accountRoutes } from "./routes/account.ts";
import { systemRoutes } from "./routes/system.ts";
import { teamAdminRoutes } from "./routes/team-admin.ts";

const app = new Hono<AppEnv>();

app.use("*", systemAccessMiddleware);
app.use("/api/*", apiGuardMiddleware);

app.route("/api/public", publicRoutes);
app.route("/api", playerRoutes);
app.route("/api/account", accountRoutes);
app.route("/api/team-admin", teamAdminRoutes);
app.route("/api/system", systemRoutes);
app.all("/api/*", () => apiJson({ error: "not_found" }, 404));

app.all("*", async (c) => {
  const url = new URL(c.req.url);
  const pageAsset = pageAssetForPath(url.pathname);
  if (pageAsset) return serveHtmlPage(c.req.raw, c.env, url, pageAsset);
  if (isVersionedTextAsset(url.pathname)) return serveVersionedTextAsset(c.req.raw, c.env);
  const response = await c.env.ASSETS.fetch(c.req.raw);
  const localLike = String(c.env.ENVIRONMENT || "dev") !== "production";
  return withHeaders(response, { noCache: localLike || NO_CACHE_ASSETS.has(url.pathname) });
});

app.onError((error) => {
  console.error("SIGN TRAINER worker error", error);
  return apiJson({ error: "server_error", message: "サーバーでエラーが発生しました。" }, 500);
});

export default app;
