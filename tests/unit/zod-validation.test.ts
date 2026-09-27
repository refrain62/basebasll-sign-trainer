import { test } from "vitest";
import assert from "node:assert/strict";
import { parseJsonBody } from "../../src/validation/request.ts";
import { adminInviteBodySchema, playerAuthBodySchema, teamIdSchema } from "../../src/validation/schemas.ts";

test("Zod player auth schema normalizes team ID and passphrase at the HTTP boundary", () => {
  const result = playerAuthBodySchema.parse({
    teamId: "  Team_2026  ",
    passphrase: "  Baseball2026  ",
    ignored: "not forwarded"
  });
  assert.deepEqual(result, { teamId: "Team_2026", passphrase: "Baseball2026" });
});

test("Zod team ID schema rejects path-like and undersized identifiers", () => {
  assert.equal(teamIdSchema.safeParse("abc").success, false);
  assert.equal(teamIdSchema.safeParse("team/../../etc").success, false);
  assert.equal(teamIdSchema.safeParse("safe_team-01").success, true);
});

test("Zod admin invite schema maps the UI currentOwnerExit field to the service creatorExit field", () => {
  const result = adminInviteBodySchema.parse({
    teamId: "Team_2026",
    kind: "transfer",
    currentOwnerExit: true,
    expiresHours: "24"
  });
  assert.equal(result.creatorExit, true);
  assert.equal(result.kind, "transfer");
});

test("parseJsonBody returns a structured 400 response for invalid request types", async () => {
  const request = new Request("https://example.test/api/auth", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ teamId: 1234, passphrase: "Baseball2026" })
  });
  const parsed = await parseJsonBody(request, playerAuthBodySchema);
  assert.equal(parsed.data, null);
  assert.equal(parsed.response?.status, 400);
  const body = await parsed.response?.json();
  assert.equal(body.error, "invalid_request");
  assert.ok(body.fields.some((field) => field.path === "teamId"));
});

test("parseJsonBody rejects oversized JSON before Zod validation", async () => {
  const request = new Request("https://example.test/api/auth", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "content-length": String(70 * 1024)
    },
    body: JSON.stringify({ teamId: "Team_2026", passphrase: "x" })
  });
  const parsed = await parseJsonBody(request, playerAuthBodySchema);
  assert.equal(parsed.data, null);
  assert.equal(parsed.response?.status, 413);
  const body = await parsed.response?.json();
  assert.equal(body.error, "payload_too_large");
});
