import { expect, test } from "vitest";
import assert from "node:assert/strict";
import { FEATURE_KEYS } from "../../src/config/features.ts";
import { createEntitlementService } from "../../src/services/entitlement-service.ts";

function fixture({ planCode = "free", entitlements = [], usage = null } = {}) {
  const calls = [];
  const subscriptionRepository = {
    async ensureTeamDefaults(teamId) { calls.push(["ensure", teamId]); },
    async findTeamPlan(teamId) {
      return {
        teamId,
        code: planCode,
        name: planCode === "free" ? "Free" : "Team Plus",
        description: "test",
        monthlyPriceYen: planCode === "free" ? 0 : null,
        availableForPurchase: false,
        active: true,
        subscriptionStatus: "active",
        provider: planCode === "free" ? "none" : "stripe",
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false
      };
    },
    async listEntitlements() { return entitlements; },
    async getUsage(teamId) { return usage || { teamId, storageBytes: 0, imageCount: 0, videoBytes: 0, videoCount: 0, updatedAt: null }; },
    async listTeamPlans(teamIds) {
      return teamIds.map((teamId) => ({
        teamId, code: planCode, name: planCode === "free" ? "Free" : "Team Plus", description: "test",
        monthlyPriceYen: planCode === "free" ? 0 : null, availableForPurchase: false,
        active: true,
        subscriptionStatus: "active", provider: planCode === "free" ? "none" : "stripe",
        currentPeriodEnd: null, cancelAtPeriodEnd: false
      }));
    }
  };
  return { service: createEntitlementService({ subscriptionRepository }), calls };
}

test("Free plan exposes core plan metadata while direct uploads remain disabled", async () => {
  const { service } = fixture({
    entitlements: [
      { featureKey: FEATURE_KEYS.DIRECT_IMAGE_UPLOAD, enabled: false, limitValue: null },
      { featureKey: FEATURE_KEYS.DIRECT_VIDEO_UPLOAD, enabled: false, limitValue: null },
      { featureKey: FEATURE_KEYS.CLOUD_STORAGE, enabled: false, limitValue: 0 }
    ]
  });
  const state = await service.summary("T1");
  assert.equal(state.plan.code, "free");
  assert.equal(state.plan.isFree, true);
  assert.equal(state.plan.monthlyPriceYen, 0);
  assert.equal(state.entitlements.direct_image_upload.enabled, false);
  assert.equal(state.entitlements.cloud_storage.limit, 0);
  assert.equal(await service.canUseFeature("T1", FEATURE_KEYS.DIRECT_IMAGE_UPLOAD), false);
});

test("future paid entitlements can be enabled without coupling product code to Stripe", async () => {
  const { service } = fixture({
    planCode: "team_plus",
    entitlements: [
      { featureKey: FEATURE_KEYS.DIRECT_IMAGE_UPLOAD, enabled: true, limitValue: null },
      { featureKey: FEATURE_KEYS.CLOUD_STORAGE, enabled: true, limitValue: 2147483648 }
    ]
  });
  const state = await service.summary("T2");
  assert.equal(state.plan.code, "team_plus");
  assert.equal(state.plan.provider, "stripe");
  assert.equal(state.entitlements.cloud_storage.limit, 2147483648);
  assert.equal(await service.canUseFeature("T2", FEATURE_KEYS.DIRECT_IMAGE_UPLOAD), true);
});

test("assertFeature blocks unavailable future features with a service error", async () => {
  const { service } = fixture({ entitlements: [{ featureKey: FEATURE_KEYS.DIRECT_IMAGE_UPLOAD, enabled: false, limitValue: null }] });
  await expect(service.assertFeature("T1", FEATURE_KEYS.DIRECT_IMAGE_UPLOAD)).rejects.toMatchObject({
    code: "feature_not_available",
    status: 403,
    details: { feature: FEATURE_KEYS.DIRECT_IMAGE_UPLOAD }
  });
});

test("planSummaries returns a team keyed map for account and system dashboards", async () => {
  const { service } = fixture();
  const plans = await service.planSummaries(["T1", "T2"]);
  assert.equal(plans.T1.name, "Free");
  assert.equal(plans.T2.isFree, true);
});


test("canceled subscriptions do not keep paid feature access", async () => {
  const subscriptionRepository = {
    async ensureTeamDefaults() {},
    async findTeamPlan(teamId) { return { teamId, code: "team_plus", name: "Team Plus", description: "", monthlyPriceYen: null, availableForPurchase: false, active: true, subscriptionStatus: "canceled", provider: "stripe", currentPeriodEnd: null, cancelAtPeriodEnd: false }; },
    async listEntitlements() { return [{ featureKey: FEATURE_KEYS.DIRECT_IMAGE_UPLOAD, enabled: true, limitValue: null }]; },
    async getUsage(teamId) { return { teamId, storageBytes: 0, imageCount: 0, videoBytes: 0, videoCount: 0, updatedAt: null }; },
    async listTeamPlans() { return []; }
  };
  const service = createEntitlementService({ subscriptionRepository });
  assert.equal(await service.canUseFeature("T3", FEATURE_KEYS.DIRECT_IMAGE_UPLOAD), false);
});
