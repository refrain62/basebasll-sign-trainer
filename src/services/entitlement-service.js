import { DEFAULT_PLAN_CODE } from "../config/features.js";
import { ServiceError } from "./errors.js";

const ENTITLED_SUBSCRIPTION_STATUSES = new Set(["active", "trialing", "past_due"]);

function entitlementMap(rows, accessActive = true) {
  return Object.fromEntries((rows || []).map((row) => [row.featureKey, {
    enabled: accessActive && Boolean(row.enabled),
    limit: row.limitValue == null ? null : Number(row.limitValue)
  }]));
}

function publicPlan(plan) {
  if (!plan) return null;
  return {
    code: plan.code,
    name: plan.name,
    description: plan.description,
    monthlyPriceYen: plan.monthlyPriceYen,
    availableForPurchase: Boolean(plan.availableForPurchase),
    status: plan.subscriptionStatus,
    provider: plan.provider,
    currentPeriodEnd: plan.currentPeriodEnd,
    cancelAtPeriodEnd: Boolean(plan.cancelAtPeriodEnd),
    active: Boolean(plan.active),
    isFree: plan.code === DEFAULT_PLAN_CODE
  };
}

export function createEntitlementService({ subscriptionRepository }) {
  async function summary(teamId) {
    await subscriptionRepository.ensureTeamDefaults(teamId);
    const plan = await subscriptionRepository.findTeamPlan(teamId);
    if (!plan) throw new ServiceError("plan_not_found", "チームのプラン情報を確認できませんでした。", 500);
    const [rows, usage] = await Promise.all([
      subscriptionRepository.listEntitlements(plan.code),
      subscriptionRepository.getUsage(teamId)
    ]);
    const accessActive = Boolean(plan.active) && ENTITLED_SUBSCRIPTION_STATUSES.has(String(plan.subscriptionStatus || ""));
    return {
      plan: publicPlan(plan),
      entitlements: entitlementMap(rows, accessActive),
      usage: usage || { teamId, storageBytes: 0, imageCount: 0, videoBytes: 0, videoCount: 0, updatedAt: null }
    };
  }

  async function planSummaries(teamIds) {
    const ids = [...new Set((teamIds || []).map(String).filter(Boolean))];
    if (!ids.length) return {};
    const rows = await subscriptionRepository.listTeamPlans(ids);
    const byTeam = Object.fromEntries(rows.map((row) => [row.teamId, publicPlan(row)]));
    for (const teamId of ids) {
      if (!byTeam[teamId]) {
        await subscriptionRepository.ensureTeamDefaults(teamId);
        const row = await subscriptionRepository.findTeamPlan(teamId);
        if (row) byTeam[teamId] = publicPlan(row);
      }
    }
    return byTeam;
  }

  async function canUseFeature(teamId, featureKey) {
    const state = await summary(teamId);
    return Boolean(state.entitlements?.[featureKey]?.enabled);
  }

  async function assertFeature(teamId, featureKey, message = "この機能は現在のプランでは利用できません。") {
    if (!(await canUseFeature(teamId, featureKey))) {
      throw new ServiceError("feature_not_available", message, 403, { feature: featureKey });
    }
    return true;
  }

  return { summary, planSummaries, canUseFeature, assertFeature };
}
