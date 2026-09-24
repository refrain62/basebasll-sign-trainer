import { Hono } from "hono";
import { NO_CACHE_ASSETS } from "./config/constants.js";
import { apiJson, withHeaders } from "./http/response.js";
import { pageAssetForPath, serveHtmlPage } from "./http/pages.js";
import { apiGuardMiddleware } from "./middleware/api-guard.js";
import { systemAccessMiddleware } from "./middleware/system-access.js";
import { playerRoutes } from "./routes/player.js";
import { systemRoutes } from "./routes/system.js";
import { teamAdminRoutes } from "./routes/team-admin.js";

const app = new Hono();

app.use("*", systemAccessMiddleware);
app.use("/api/*", apiGuardMiddleware);

app.route("/api", playerRoutes);
app.route("/api/team-admin", teamAdminRoutes);
app.route("/api/system", systemRoutes);
app.all("/api/*", () => apiJson({ error: "not_found" }, 404));

app.all("*", async (c) => {
  const url = new URL(c.req.url);
  const pageAsset = pageAssetForPath(url.pathname);
  if (pageAsset) return serveHtmlPage(c.req.raw, c.env, url, pageAsset);
  const response = await c.env.ASSETS.fetch(c.req.raw);
  return withHeaders(response, { noCache: NO_CACHE_ASSETS.has(url.pathname) });
});

app.onError((error) => {
  console.error("SIGN TRAINER worker error", error);
  return apiJson({ error: "server_error", message: "サーバーでエラーが発生しました。" }, 500);
});

export default app;
