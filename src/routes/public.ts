import { Hono } from "hono";
import type { AppEnv } from "../types.ts";
import { publicLegal } from "../controllers/public-controller.ts";

const publicRoutes = new Hono<AppEnv>();
publicRoutes.get("/legal", (c) => publicLegal(c.req.raw, c.env));
export { publicRoutes };
