import { SYSTEM_COOKIE, TEAM_ADMIN_COOKIE } from "../config/constants.js";
import { getTeam } from "../repositories/team-repository.js";
import { constantTimeEqual } from "./encoding.js";
import { readRoleSession, systemSecretVersion } from "./session.js";

export async function requireTeamAdmin(request, env, teamId) {
  const session = await readRoleSession(request, env, TEAM_ADMIN_COOKIE, "team-admin");
  if (!session || session.teamId !== teamId) return null;
  const team = await getTeam(env.DB, teamId);
  if (!team || Number(session.ver || 0) !== Number(team.admin_session_version || 1)) return null;
  return session;
}

export async function requireSystem(request, env) {
  const session = await readRoleSession(request, env, SYSTEM_COOKIE, "system");
  if (!session || !env.SYSTEM_ADMIN_SECRET) return null;
  const expectedVersion = await systemSecretVersion(env.SYSTEM_ADMIN_SECRET);
  return constantTimeEqual(String(session.ver || ""), expectedVersion) ? session : null;
}
