import { Hono } from "hono";
import type { AppEnv } from "../types.ts";
import { playerAuth, playerLogout, playerSession, playerSigns } from "../controllers/player-controller.ts";

const playerRoutes = new Hono<AppEnv>();
const requestUrl = (c) => new URL(c.req.url);

playerRoutes.get("/session", (c) => playerSession(c.req.raw, c.env, requestUrl(c)));
playerRoutes.post("/auth", (c) => playerAuth(c.req.raw, c.env, requestUrl(c)));
playerRoutes.post("/logout", (c) => playerLogout(c.req.raw, requestUrl(c)));
playerRoutes.get("/signs", (c) => playerSigns(c.req.raw, c.env, requestUrl(c)));

export { playerRoutes };
