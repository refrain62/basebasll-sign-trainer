PRAGMA foreign_keys = ON;

-- Billing is intentionally disabled for now. These tables establish a stable
-- plan/entitlement boundary so future paid storage features do not leak Stripe
-- or provider-specific logic into product code.
CREATE TABLE IF NOT EXISTS plans (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  monthly_price_yen INTEGER,
  available_for_purchase INTEGER NOT NULL DEFAULT 0 CHECK (available_for_purchase IN (0,1)),
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0,1)),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS plan_entitlements (
  plan_code TEXT NOT NULL,
  feature_key TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 0 CHECK (enabled IN (0,1)),
  limit_value INTEGER,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(plan_code, feature_key),
  FOREIGN KEY(plan_code) REFERENCES plans(code) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS team_subscriptions (
  team_id TEXT PRIMARY KEY,
  plan_code TEXT NOT NULL DEFAULT 'free',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','trialing','past_due','canceled','incomplete')),
  provider TEXT NOT NULL DEFAULT 'none' CHECK (provider IN ('none','stripe')),
  provider_customer_id TEXT,
  provider_subscription_id TEXT,
  current_period_end INTEGER,
  cancel_at_period_end INTEGER NOT NULL DEFAULT 0 CHECK (cancel_at_period_end IN (0,1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(team_id) REFERENCES teams(id) ON DELETE CASCADE,
  FOREIGN KEY(plan_code) REFERENCES plans(code)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_team_subscriptions_provider_subscription
ON team_subscriptions(provider_subscription_id)
WHERE provider_subscription_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_team_subscriptions_plan_status
ON team_subscriptions(plan_code, status);

CREATE TABLE IF NOT EXISTS team_usage (
  team_id TEXT PRIMARY KEY,
  storage_bytes INTEGER NOT NULL DEFAULT 0 CHECK (storage_bytes >= 0),
  image_count INTEGER NOT NULL DEFAULT 0 CHECK (image_count >= 0),
  video_bytes INTEGER NOT NULL DEFAULT 0 CHECK (video_bytes >= 0),
  video_count INTEGER NOT NULL DEFAULT 0 CHECK (video_count >= 0),
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(team_id) REFERENCES teams(id) ON DELETE CASCADE
);

-- Free is the only selectable plan today. Paid plans are deliberately seeded as
-- non-purchasable placeholders so feature policy can be developed independently
-- of the eventual price / Stripe product IDs.
INSERT OR IGNORE INTO plans(code,name,description,monthly_price_yen,available_for_purchase,active,sort_order) VALUES
  ('free','Free','サイン登録・グループ・YouTube動画・クイズ・共有・PWAなどの基本機能',0,0,1,10),
  ('team_plus','Team Plus','画像の直接保存など、クラウド保存を使う追加機能向けの将来プラン',NULL,0,1,20),
  ('team_pro','Team Pro','動画の直接保存など、より大きな保存容量を使う将来プラン',NULL,0,1,30);

INSERT OR IGNORE INTO plan_entitlements(plan_code,feature_key,enabled,limit_value) VALUES
  ('free','direct_image_upload',0,NULL),
  ('free','direct_video_upload',0,NULL),
  ('free','cloud_storage',0,0),
  ('team_plus','direct_image_upload',1,NULL),
  ('team_plus','direct_video_upload',0,NULL),
  ('team_plus','cloud_storage',1,2147483648),
  ('team_pro','direct_image_upload',1,NULL),
  ('team_pro','direct_video_upload',1,NULL),
  ('team_pro','cloud_storage',1,10737418240);

-- Existing teams remain free. No billing is activated by this migration.
INSERT OR IGNORE INTO team_subscriptions(team_id,plan_code,status,provider)
SELECT id,'free','active','none' FROM teams;

INSERT OR IGNORE INTO team_usage(team_id)
SELECT id FROM teams;

-- Keep future team-creation paths safe even if a caller forgets to explicitly
-- provision plan rows. Product code still treats plan access through the
-- entitlement service rather than reading these tables directly.
CREATE TRIGGER IF NOT EXISTS trg_teams_default_subscription
AFTER INSERT ON teams
BEGIN
  INSERT OR IGNORE INTO team_subscriptions(team_id,plan_code,status,provider)
  VALUES(NEW.id,'free','active','none');
  INSERT OR IGNORE INTO team_usage(team_id) VALUES(NEW.id);
END;
