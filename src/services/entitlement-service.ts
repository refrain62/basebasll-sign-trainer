import { DEFAULT_PLAN_CODE } from "../config/features.ts";
import { ServiceError } from "./errors.ts";

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
    const ids: string[] = [...new Set<string>((teamIds || []).map(String).filter(Boolean))];
    if (!ids.length) return {};
    await subscriptionRepository.ensureTeamDefaultsForTeams(ids);
    const rows = await subscriptionRepository.listTeamPlans(ids);
    return Object.fromEntries(rows.map((row) => [row.teamId, publicPlan(row)]));
  }

  async function canUseFeature(teamId, featureKey: string) {
    const state = await summary(teamId);
    return Boolean(state.entitlements?.[featureKey]?.enabled);
  }

  async function planDefinitions() {
    return subscriptionRepository.listPlanDefinitions();
  }

  async function assignSystemPlan(teamId, planCode: string) {
    const plan = await subscriptionRepository.findPlanDefinition(planCode);
    if (!plan || !plan.active) throw new ServiceError("plan_not_found", "指定したプランを利用できません。", 400);
    await subscriptionRepository.ensureTeamDefaults(teamId);
    const previous = await subscriptionRepository.findTeamPlan(teamId);
    await subscriptionRepository.setSystemPlan(teamId, planCode);
    return { previous: publicPlan(previous), current: (await summary(teamId)).plan };
  }

  async function assertFeature(teamId, featureKey: string, message = "この機能は現在のプランでは利用できません。") {
    if (!(await canUseFeature(teamId, featureKey))) {
      throw new ServiceError("feature_not_available", message, 403, { feature: featureKey });
    }
    return true;
  }

  return { summary, planSummaries, planDefinitions, assignSystemPlan, canUseFeature, assertFeature };
}
