import { Hono } from "hono";
import { publicLegal } from "../controllers/public-controller.js";

const publicRoutes = new Hono();
publicRoutes.get("/legal", (c) => publicLegal(c.req.raw, c.env));
export { publicRoutes };
