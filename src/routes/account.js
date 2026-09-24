import { Hono } from "hono";
import { apiJson } from "../http/response.js";
import {
  accountCreateTeam,
  accountDelete,
  accountInviteAccept,
  accountInvitePreview,
  accountLogout,
  accountOAuthCallback,
  accountOAuthStart,
  accountProviders,
  accountSession
} from "../controllers/account-controller.js";

const accountRoutes = new Hono();
const requestUrl = (c) => new URL(c.req.url);
const providerParam = (c) => {
  const value = String(c.req.param("provider") || "");
  return ["google", "line"].includes(value) ? value : null;
};
const inviteParam = (c) => {
  const value = String(c.req.param("token") || "");
  return /^[A-Za-z0-9_-]{20,200}$/.test(value) ? value : null;
};

accountRoutes.get("/providers", (c) => accountProviders(c.req.raw, c.env));
accountRoutes.get("/session", (c) => accountSession(c.req.raw, c.env));
accountRoutes.post("/logout", (c) => accountLogout(c.req.raw, c.env, requestUrl(c)));
accountRoutes.post("/teams", (c) => accountCreateTeam(c.req.raw, c.env));
accountRoutes.delete("/account", (c) => accountDelete(c.req.raw, c.env, requestUrl(c)));

accountRoutes.get("/oauth/:provider/start", (c) => {
  const provider = providerParam(c);
  if (!provider) return apiJson({ error: "provider_not_found" }, 404);
  return accountOAuthStart(c.req.raw, c.env, requestUrl(c), provider);
});
accountRoutes.get("/oauth/:provider/callback", (c) => {
  const provider = providerParam(c);
  if (!provider) return apiJson({ error: "provider_not_found" }, 404);
  return accountOAuthCallback(c.req.raw, c.env, requestUrl(c), provider);
});

accountRoutes.get("/invites/:token", (c) => {
  const token = inviteParam(c);
  if (!token) return apiJson({ error: "invite_not_found" }, 404);
  return accountInvitePreview(c.req.raw, c.env, token);
});
accountRoutes.post("/invites/:token/accept", (c) => {
  const token = inviteParam(c);
  if (!token) return apiJson({ error: "invite_not_found" }, 404);
  return accountInviteAccept(c.req.raw, c.env, token);
});

export { accountRoutes };
