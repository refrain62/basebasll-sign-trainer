import { Hono } from "hono";
import { apiJson } from "../http/response.js";
import {
  teamAdminAuth,
  teamAdminCreateGroup,
  teamAdminCreateSign,
  teamAdminCreateVideo,
  teamAdminDeleteGroup,
  teamAdminDeleteSign,
  teamAdminDeleteVideo,
  teamAdminGetTeam,
  teamAdminLogout,
  teamAdminSession,
  teamAdminUpdateGroup,
  teamAdminUpdateSign,
  teamAdminUpdateTeam,
  teamAdminUpdateVideo
} from "../controllers/team-admin-controller.js";

const teamAdminRoutes = new Hono();
const requestUrl = (c) => new URL(c.req.url);
const numericParam = (c, name) => {
  const value = Number(c.req.param(name));
  return Number.isInteger(value) && value > 0 ? value : null;
};
const withNumericParam = (name, handler) => (c) => {
  const value = numericParam(c, name);
  if (value === null) return apiJson({ error: "not_found" }, 404);
  return handler(c, value);
};

teamAdminRoutes.get("/session", (c) => teamAdminSession(c.req.raw, c.env, requestUrl(c)));
teamAdminRoutes.post("/auth", (c) => teamAdminAuth(c.req.raw, c.env, requestUrl(c)));
teamAdminRoutes.post("/logout", (c) => teamAdminLogout(c.req.raw, requestUrl(c)));
teamAdminRoutes.get("/team", (c) => teamAdminGetTeam(c.req.raw, c.env, requestUrl(c)));
teamAdminRoutes.put("/team", (c) => teamAdminUpdateTeam(c.req.raw, c.env, requestUrl(c)));

teamAdminRoutes.post("/groups", (c) => teamAdminCreateGroup(c.req.raw, c.env, requestUrl(c)));
teamAdminRoutes.put("/groups/:groupId", withNumericParam("groupId", (c, groupId) => teamAdminUpdateGroup(c.req.raw, c.env, requestUrl(c), groupId)));
teamAdminRoutes.delete("/groups/:groupId", withNumericParam("groupId", (c, groupId) => teamAdminDeleteGroup(c.req.raw, c.env, requestUrl(c), groupId)));

teamAdminRoutes.post("/signs", (c) => teamAdminCreateSign(c.req.raw, c.env, requestUrl(c)));
teamAdminRoutes.put("/signs/:signId", withNumericParam("signId", (c, signId) => teamAdminUpdateSign(c.req.raw, c.env, requestUrl(c), signId)));
teamAdminRoutes.delete("/signs/:signId", withNumericParam("signId", (c, signId) => teamAdminDeleteSign(c.req.raw, c.env, requestUrl(c), signId)));

teamAdminRoutes.post("/signs/:signId/videos", withNumericParam("signId", (c, signId) => teamAdminCreateVideo(c.req.raw, c.env, requestUrl(c), signId)));
teamAdminRoutes.put("/videos/:videoId", withNumericParam("videoId", (c, videoId) => teamAdminUpdateVideo(c.req.raw, c.env, requestUrl(c), videoId)));
teamAdminRoutes.delete("/videos/:videoId", withNumericParam("videoId", (c, videoId) => teamAdminDeleteVideo(c.req.raw, c.env, requestUrl(c), videoId)));

export { teamAdminRoutes };
