import { test } from "vitest";
import assert from "node:assert/strict";
import { deauthorizeLineApp } from "../../src/oauth/line-provider.ts";

test("LINE deauthorization issues a short-lived channel token and revokes the linked app", async () => {
  const calls = [];
  const fetchFn = async (url, options = {}) => {
    calls.push([url, options]);
    if (String(url).includes("/oauth2/v3/token")) {
      return new Response(JSON.stringify({ access_token: "channel-token", expires_in: 900, token_type: "Bearer" }), { status: 200, headers: { "content-type": "application/json" } });
    }
    if (String(url).includes("/user/v1/deauthorize")) return new Response(null, { status: 204 });
    return new Response("not found", { status: 404 });
  };
  await deauthorizeLineApp({ env: { LINE_CHANNEL_ID: "123", LINE_CHANNEL_SECRET: "secret" }, userAccessToken: "user-token", fetchFn });
  assert.equal(calls.length, 2);
  assert.match(String(calls[0][1].body), /grant_type=client_credentials/);
  assert.equal(calls[1][1].headers.authorization, "Bearer channel-token");
  assert.match(String(calls[1][1].body), /userAccessToken=user-token/);
});
