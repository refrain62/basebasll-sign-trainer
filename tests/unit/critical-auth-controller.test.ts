import { test } from "vitest";
import assert from "node:assert/strict";
import { TEAM_ADMIN_COOKIE, USER_COOKIE } from "../../src/config/constants.ts";
import { accountDelete, accountOAuthStart } from "../../src/controllers/account-controller.ts";
import { teamAdminAuth, teamAdminCreateGroup, teamAdminCreateInvite, teamAdminTransferOwner } from "../../src/controllers/team-admin-controller.ts";
import { createSessionToken, verifySessionToken } from "../../src/security/session.ts";

const SESSION_SECRET = "SignTrainerCriticalAuthSessionSecret2026";
const SECURITY_ENV = {
  SESSION_SECRET,
  DATA_ENCRYPTION_KEY: "SignTrainerCriticalEncryptionKey2026",
  DATA_LOOKUP_KEY: "SignTrainerCriticalLookupKey2026",
  PASSWORD_PEPPER: "SignTrainerCriticalPasswordPepper2026"
};

function authDb({ teamStatus = "active", teamDeleted = false } = {}) {
  let writeCount = 0;
  return {
    get writeCount() { return writeCount; },
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
              if (sql.includes("FROM teams")) {
                if (teamDeleted && sql.includes("deleted_at IS NULL")) return null;
                return { id: params[0], name: "Team", status: teamStatus, admin_password_enabled: 1, admin_session_version: 1 };
              }
              return null;
            },
            async run() { writeCount += 1; return { success: true, meta: { changes: 1 } }; },
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

async function activeAccountCookie() {
  const now = Math.floor(Date.now() / 1000);
  const token = await createSessionToken({ role: "account", userId: "u_owner12345678", ver: 1, provider: "google", authAt: now, exp: now + 3600 }, SESSION_SECRET);
  return `${USER_COOKIE}=${token}`;
}

async function legacyTeamAdminCookie() {
  const now = Math.floor(Date.now() / 1000);
  const token = await createSessionToken({ role: "team-admin", teamId: "Team1234", ver: 1, exp: now + 3600 }, SESSION_SECRET);
  return `${TEAM_ADMIN_COOKIE}=${token}`;
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

for (const state of [
  { name: "suspended", teamStatus: "suspended", teamDeleted: false },
  { name: "soft-deleted", teamStatus: "suspended", teamDeleted: true }
]) {
  test(`team admins cannot mutate, invite, or transfer after team is ${state.name}`, async () => {
    const db = authDb(state);
    const env = { DB: db, ...SECURITY_ENV };
    const accountCookie = await activeAccountCookie();
    const legacyCookie = await legacyTeamAdminCookie();

    const accountMutationUrl = new URL("http://localhost:8787/api/team-admin/groups");
    const accountMutation = await teamAdminCreateGroup(new Request(accountMutationUrl, {
      method: "POST",
      headers: { cookie: accountCookie, "content-type": "application/json" },
      body: JSON.stringify({ teamId: "Team1234", name: "New group" })
    }), env, accountMutationUrl);
    assert.equal(accountMutation.status, 401);

    const legacyMutation = await teamAdminCreateGroup(new Request(accountMutationUrl, {
      method: "POST",
      headers: { cookie: legacyCookie, "content-type": "application/json" },
      body: JSON.stringify({ teamId: "Team1234", name: "New group" })
    }), env, accountMutationUrl);
    assert.equal(legacyMutation.status, 401);

    const inviteUrl = new URL("http://localhost:8787/api/team-admin/admins/invites");
    const invite = await teamAdminCreateInvite(new Request(inviteUrl, {
      method: "POST",
      headers: { cookie: accountCookie, "content-type": "application/json" },
      body: JSON.stringify({ teamId: "Team1234", kind: "admin" })
    }), env, inviteUrl);
    assert.equal(invite.status, 403);

    const transferUrl = new URL("http://localhost:8787/api/team-admin/admins/transfer");
    const transfer = await teamAdminTransferOwner(new Request(transferUrl, {
      method: "POST",
      headers: { cookie: accountCookie, "content-type": "application/json" },
      body: JSON.stringify({ teamId: "Team1234", nextOwnerUserId: "u_admin12345678" })
    }), env, transferUrl);
    assert.equal(transfer.status, 403);
    assert.equal(db.writeCount, 0);

    const loginUrl = new URL("http://localhost:8787/api/team-admin/auth");
    const login = await teamAdminAuth(new Request(loginUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ teamId: "Team1234", password: "password" })
    }), { DB: authDb(state), ...SECURITY_ENV }, loginUrl);
    assert.equal(login.status, state.teamDeleted ? 404 : 403);
    assert.equal(login.headers.get("set-cookie"), null);
  });
}
