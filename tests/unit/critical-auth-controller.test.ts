import { test } from "vitest";
import assert from "node:assert/strict";
import { accountDelete, accountOAuthStart } from "../../src/controllers/account-controller.ts";
import { teamAdminTransferOwner } from "../../src/controllers/team-admin-controller.ts";
import { createSessionToken, verifySessionToken } from "../../src/security/session.ts";

const SESSION_SECRET = "SignTrainerCriticalAuthSessionSecret2026";
const SECURITY_ENV = {
  SESSION_SECRET,
  DATA_ENCRYPTION_KEY: "SignTrainerCriticalEncryptionKey2026",
  DATA_LOOKUP_KEY: "SignTrainerCriticalLookupKey2026",
  PASSWORD_PEPPER: "SignTrainerCriticalPasswordPepper2026"
};

function authDb() {
  return {
    prepare(sql) {
      return {
        bind(...params) {
          return {
            async first() {
              if (sql.includes("FROM app_users")) {
                return { id: params[0], display_name: "Coach", email: "coach@example.com", status: "active", session_version: 1 };
              }
              if (sql.includes("FROM team_admin_memberships") && sql.includes("user_id=?")) {
                return { team_id: params[0], user_id: params[1], role: "owner" };
              }
              return null;
            },
            async run() { return { success: true, meta: { changes: 1 } }; },
            async all() { return { results: [] }; }
          };
        },
        async first() { return null; },
        async all() { return { results: [] }; }
      };
    }
  };
}

async function staleAccountCookie(url, userId = "u_owner12345678") {
  const now = Math.floor(Date.now() / 1000);
  const token = await createSessionToken({ role: "account", userId, ver: 1, provider: "google", authAt: now - 3600, exp: now + 3600 }, SESSION_SECRET);
  return `st_user=${token}`;
}


test("sensitive reauthentication OAuth state is bound to the currently logged-in user", async () => {
  const url = new URL("http://localhost:8787/api/account/oauth/google/start?intent=reauth&returnTo=/account");
  const request = new Request(url, { headers: { cookie: await staleAccountCookie(url) } });
  const env = { DB: authDb(), ...SECURITY_ENV, GOOGLE_CLIENT_ID: "client-id", GOOGLE_CLIENT_SECRET: "client-secret" };
  const response = await accountOAuthStart(request, env, url, "google");
  assert.equal(response.status, 302);
  const setCookie = response.headers.get("set-cookie") || "";
  const token = setCookie.match(/st_oauth=([^;]+)/)?.[1] || "";
  const oauthState = await verifySessionToken(token, SESSION_SECRET);
  assert.equal(oauthState.intent, "reauth");
  assert.equal(oauthState.expectedUserId, "u_owner12345678");
});

test("account deletion requires recent OAuth authentication", async () => {
  const url = new URL("http://localhost:8787/api/account/account");
  const request = new Request(url, {
    method: "DELETE",
    headers: { cookie: await staleAccountCookie(url), "content-type": "application/json" },
    body: JSON.stringify({ confirm: "退会する" })
  });
  const response = await accountDelete(request, { DB: authDb(), ...SECURITY_ENV }, url);
  assert.equal(response.status, 428);
  const body = await response.json();
  assert.equal(body.error, "reauth_required");
  assert.equal(body.provider, "google");
});

test("owner transfer requires recent OAuth authentication", async () => {
  const url = new URL("http://localhost:8787/api/team-admin/admins/transfer");
  const request = new Request(url, {
    method: "POST",
    headers: { cookie: await staleAccountCookie(url), "content-type": "application/json" },
    body: JSON.stringify({ teamId: "Team1234", nextOwnerUserId: "u_admin12345678" })
  });
  const response = await teamAdminTransferOwner(request, { DB: authDb(), ...SECURITY_ENV }, url);
  assert.equal(response.status, 428);
  const body = await response.json();
  assert.equal(body.error, "reauth_required");
  assert.equal(body.returnTo, "/t/Team1234/admin");
});
