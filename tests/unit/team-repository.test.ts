import { test } from "vitest";
import assert from "node:assert/strict";
import { createTeamRepository } from "../../src/repositories/team-repository.ts";

test("disabling the legacy password requires an active, non-deleted team", async () => {
  let statement;
  const db = {
    prepare(sql) {
      return {
        bind(...args) {
          return {
            sql,
            args,
            async run() { statement = { sql, args }; return { success: true, meta: { changes: 1 } }; }
          };
        }
      };
    }
  };

  await createTeamRepository(db).disableAdminPassword("Team1234");
  assert.match(statement.sql, /status='active' AND deleted_at IS NULL/);
  assert.deepEqual(statement.args, ["Team1234"]);
});
