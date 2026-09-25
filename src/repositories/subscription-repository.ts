import { DEFAULT_PLAN_CODE } from "../config/features.ts";

function nonNegativeInteger(value) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) return 0;
  return Math.trunc(number);
}

function normalizePlanRow(row) {
  if (!row) return null;
  return {
    teamId: row.team_id,
    code: row.plan_code,
    name: row.plan_name,
    description: row.plan_description || "",
    monthlyPriceYen: row.monthly_price_yen == null ? null : Number(row.monthly_price_yen),
    availableForPurchase: Boolean(row.available_for_purchase),
    active: Boolean(row.plan_active),
    subscriptionStatus: row.subscription_status,
    provider: row.provider,
    providerCustomerId: row.provider_customer_id || "",
    providerSubscriptionId: row.provider_subscription_id || "",
    currentPeriodEnd: row.current_period_end == null ? null : Number(row.current_period_end),
    cancelAtPeriodEnd: Boolean(row.cancel_at_period_end)
  };
}

export function createSubscriptionRepository(db) {
  return {
    async ensureTeamDefaults(teamId) {
      return db.batch([
        db.prepare("INSERT OR IGNORE INTO team_subscriptions(team_id,plan_code,status,provider) VALUES(?,?,'active','none')").bind(teamId, DEFAULT_PLAN_CODE),
        db.prepare("INSERT OR IGNORE INTO team_usage(team_id) VALUES(?)").bind(teamId)
      ]);
    },

    async findTeamPlan(teamId) {
      const row = await db.prepare(`
        SELECT s.team_id,s.plan_code,s.status AS subscription_status,s.provider,
               s.provider_customer_id,s.provider_subscription_id,s.current_period_end,s.cancel_at_period_end,
               p.name AS plan_name,p.description AS plan_description,p.monthly_price_yen,
               p.available_for_purchase,p.active AS plan_active
        FROM team_subscriptions s
        JOIN plans p ON p.code=s.plan_code
        WHERE s.team_id=?
      `).bind(teamId).first();
      return normalizePlanRow(row);
    },

    async listTeamPlans(teamIds) {
      const ids = [...new Set((teamIds || []).map(String).filter(Boolean))];
      if (!ids.length) return [];
      const placeholders = ids.map(() => "?").join(",");
      const result = await db.prepare(`
        SELECT s.team_id,s.plan_code,s.status AS subscription_status,s.provider,
               s.provider_customer_id,s.provider_subscription_id,s.current_period_end,s.cancel_at_period_end,
               p.name AS plan_name,p.description AS plan_description,p.monthly_price_yen,
               p.available_for_purchase,p.active AS plan_active
        FROM team_subscriptions s
        JOIN plans p ON p.code=s.plan_code
        WHERE s.team_id IN (${placeholders})
      `).bind(...ids).all();
      return (result.results || []).map(normalizePlanRow);
    },

    async listEntitlements(planCode) {
      const result = await db.prepare(`
        SELECT feature_key,enabled,limit_value
        FROM plan_entitlements
        WHERE plan_code=?
        ORDER BY feature_key
      `).bind(planCode).all();
      return (result.results || []).map((row) => ({
        featureKey: row.feature_key,
        enabled: Boolean(row.enabled),
        limitValue: row.limit_value == null ? null : Number(row.limit_value)
      }));
    },

    async getUsage(teamId) {
      const row = await db.prepare("SELECT team_id,storage_bytes,image_count,video_bytes,video_count,updated_at FROM team_usage WHERE team_id=?")
        .bind(teamId).first();
      if (!row) return null;
      return {
        teamId: row.team_id,
        storageBytes: Number(row.storage_bytes || 0),
        imageCount: Number(row.image_count || 0),
        videoBytes: Number(row.video_bytes || 0),
        videoCount: Number(row.video_count || 0),
        updatedAt: row.updated_at
      };
    },

    // Future Stripe webhook boundary. Product features should never branch on
    // Stripe directly; they only read the resulting plan through EntitlementService.
    async setProviderSubscription({ teamId, planCode, status, provider = "stripe", providerCustomerId = null, providerSubscriptionId = null, currentPeriodEnd = null, cancelAtPeriodEnd = false }) {
      return db.prepare(`
        INSERT INTO team_subscriptions(team_id,plan_code,status,provider,provider_customer_id,provider_subscription_id,current_period_end,cancel_at_period_end,updated_at)
        VALUES(?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP)
        ON CONFLICT(team_id) DO UPDATE SET
          plan_code=excluded.plan_code,status=excluded.status,provider=excluded.provider,
          provider_customer_id=excluded.provider_customer_id,provider_subscription_id=excluded.provider_subscription_id,
          current_period_end=excluded.current_period_end,cancel_at_period_end=excluded.cancel_at_period_end,
          updated_at=CURRENT_TIMESTAMP
      `).bind(teamId, planCode, status, provider, providerCustomerId, providerSubscriptionId, currentPeriodEnd, cancelAtPeriodEnd ? 1 : 0).run();
    },

    async recordUsage({ teamId, storageBytes, imageCount, videoBytes, videoCount }) {
      return db.prepare(`
        INSERT INTO team_usage(team_id,storage_bytes,image_count,video_bytes,video_count,updated_at)
        VALUES(?,?,?,?,?,CURRENT_TIMESTAMP)
        ON CONFLICT(team_id) DO UPDATE SET
          storage_bytes=excluded.storage_bytes,image_count=excluded.image_count,
          video_bytes=excluded.video_bytes,video_count=excluded.video_count,
          updated_at=CURRENT_TIMESTAMP
      `).bind(teamId, nonNegativeInteger(storageBytes), nonNegativeInteger(imageCount), nonNegativeInteger(videoBytes), nonNegativeInteger(videoCount)).run();
    }
  };
}
