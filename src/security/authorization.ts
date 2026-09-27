import { SYSTEM_COOKIE, TEAM_ADMIN_COOKIE, USER_COOKIE } from "../config/constants.ts";
import { FEATURE_KEYS } from "../config/features.ts";
import { getTeam } from "../repositories/team-repository.ts";
import { createUserRepository } from "../repositories/user-repository.ts";
import { createAdminMembershipRepository } from "../repositories/admin-membership-repository.ts";
import { createSubscriptionRepository } from "../repositories/subscription-repository.ts";
import { constantTimeEqual } from "./encoding.ts";
import { createDataProtectorFromEnv } from "./data-protection.ts";
import { readRoleSession, systemSecretVersion } from "./session.ts";


async function teamFeatureEnabled(env, teamId, featureKey) {
  const subscriptions = createSubscriptionRepository(env.DB);
  await subscriptions.ensureTeamDefaults(teamId);
  const plan = await subscriptions.findTeamPlan(teamId);
  if (!plan || !plan.active || !["active", "trialing", "past_due"].includes(String(plan.subscriptionStatus || ""))) return false;
  const rows = await subscriptions.listEntitlements(plan.code);
  return Boolean(rows.find((row) => row.featureKey === featureKey)?.enabled);
}

export async function requireUser(request, env) {
  const session = await readRoleSession(request, env, USER_COOKIE, "account");
  if (!session?.userId) return null;
  const user = await createUserRepository(env.DB, createDataProtectorFromEnv(env)).findById(session.userId);
  if (!user || Number(session.ver || 0) !== Number(user.session_version || 1)) return null;
  return { ...session, user };
}

export async function requireLegacyTeamAdmin(request, env, teamId) {
  const session = await readRoleSession(request, env, TEAM_ADMIN_COOKIE, "team-admin");
  if (!session || session.teamId !== teamId) return null;
  const team = await getTeam(env.DB, teamId, createDataProtectorFromEnv(env));
  if (!team || !team.admin_password_enabled || Number(session.ver || 0) !== Number(team.admin_session_version || 1)) return null;
  return { ...session, authType: "legacy-password", teamRole: "legacy" };
}

export async function requireTeamAdmin(request, env, teamId) {
  const account = await requireUser(request, env);
  if (account) {
    const membership = await createAdminMembershipRepository(env.DB, createDataProtectorFromEnv(env)).find(teamId, account.userId);
    if (membership) {
      if (membership.role === "admin" && !(await teamFeatureEnabled(env, teamId, FEATURE_KEYS.SUB_ADMIN_MANAGEMENT))) return null;
      return { ...account, authType: "account", teamId, teamRole: membership.role };
    }
  }

  return requireLegacyTeamAdmin(request, env, teamId);
}

export async function requireTeamOwner(request, env, teamId) {
  const account = await requireUser(request, env);
  if (!account) return null;
  const membership = await createAdminMembershipRepository(env.DB, createDataProtectorFromEnv(env)).find(teamId, account.userId);
  if (!membership || membership.role !== "owner") return null;
  return { ...account, authType: "account", teamId, teamRole: "owner" };
}

export async function requireSystem(request, env) {
  const session = await readRoleSession(request, env, SYSTEM_COOKIE, "system");
  if (!session || !env.SYSTEM_ADMIN_SECRET) return null;
  const expectedVersion = await systemSecretVersion(env.SYSTEM_ADMIN_SECRET);
  return constantTimeEqual(String(session.ver || ""), expectedVersion) ? session : null;
}
