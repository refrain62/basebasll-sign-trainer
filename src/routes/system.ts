import { Hono } from "hono";
import type { AppEnv } from "../types.ts";
import { apiJson } from "../http/response.ts";
import {
  systemAuth,
  systemCreateTeam,
  systemDeleteTeam,
  systemRestoreTeam,
  systemListTeams,
  systemLogout,
  systemSession,
  systemUpdateTeam,
  systemDataProtectionStatus,
  systemProtectData,
  systemListNotices,
  systemCreateNotice,
  systemUpdateNotice,
  systemDeleteNotice
} from "../controllers/system-controller.ts";

const systemRoutes = new Hono<AppEnv>();
const requestUrl = (c) => new URL(c.req.url);
const teamIdParam = (c) => {
  const value = String(c.req.param("teamId") || "");
  return /^[A-Za-z0-9_-]+$/.test(value) ? value : null;
};
const noticeIdParam = (c) => {
  const value = Number(c.req.param("noticeId"));
  return Number.isInteger(value) && value > 0 ? value : null;
};
const withNoticeId = (handler) => (c) => {
  const noticeId = noticeIdParam(c);
  if (!noticeId) return apiJson({ error: "not_found" }, 404);
  return handler(c, noticeId);
};
const withTeamId = (handler) => (c) => {
  const teamId = teamIdParam(c);
  if (!teamId) return apiJson({ error: "not_found" }, 404);
  return handler(c, teamId);
};

systemRoutes.get("/session", (c) => systemSession(c.req.raw, c.env));
systemRoutes.post("/auth", (c) => systemAuth(c.req.raw, c.env, requestUrl(c)));
systemRoutes.post("/logout", (c) => systemLogout(c.req.raw, requestUrl(c)));
systemRoutes.get("/teams", (c) => systemListTeams(c.req.raw, c.env));
systemRoutes.post("/teams", (c) => systemCreateTeam(c.req.raw, c.env));
systemRoutes.put("/teams/:teamId", withTeamId((c, teamId) => systemUpdateTeam(c.req.raw, c.env, teamId)));
systemRoutes.delete("/teams/:teamId", withTeamId((c, teamId) => systemDeleteTeam(c.req.raw, c.env, teamId)));
systemRoutes.post("/teams/:teamId/restore", withTeamId((c, teamId) => systemRestoreTeam(c.req.raw, c.env, teamId)));
systemRoutes.get("/security/data-protection", (c) => systemDataProtectionStatus(c.req.raw, c.env));
systemRoutes.post("/security/data-protection", (c) => systemProtectData(c.req.raw, c.env));
systemRoutes.get("/notices", (c) => systemListNotices(c.req.raw, c.env));
systemRoutes.post("/notices", (c) => systemCreateNotice(c.req.raw, c.env));
systemRoutes.put("/notices/:noticeId", withNoticeId((c, noticeId) => systemUpdateNotice(c.req.raw, c.env, noticeId)));
systemRoutes.delete("/notices/:noticeId", withNoticeId((c, noticeId) => systemDeleteNotice(c.req.raw, c.env, noticeId)));

export { systemRoutes };
