-- Promo code system: codes + redemptions ledger.
-- Credits granted by codes are stored in assessment_credits (credit_type = 'rapid-screen' for TEAM10).

CREATE TABLE IF NOT EXISTS promo_codes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  description TEXT,
  reward_type TEXT,
  reward_value INTEGER,
  max_uses INTEGER,
  uses_count INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT true,
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS promo_redemptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  promo_code TEXT,
  redeemed_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (user_id, promo_code)
);

CREATE INDEX IF NOT EXISTS idx_promo_redemptions_user ON promo_redemptions (user_id);

-- RLS
ALTER TABLE promo_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE promo_redemptions ENABLE ROW LEVEL SECURITY;

-- Authenticated users may look up codes by code (active only); writes are service-role only.
DROP POLICY IF EXISTS "Authenticated can read active promo codes" ON promo_codes;
CREATE POLICY "Authenticated can read active promo codes"
  ON promo_codes FOR SELECT
  TO authenticated
  USING (active = true);

DROP POLICY IF EXISTS "Users can view own redemptions" ON promo_redemptions;
CREATE POLICY "Users can view own redemptions"
  ON promo_redemptions FOR SELECT
  USING (auth.uid() = user_id);

-- Seed the TEAM10 code (idempotent).
INSERT INTO promo_codes (code, description, reward_type, reward_value, max_uses, active)
VALUES ('TEAM10', '10 free Rapid Screens for team network members', 'rapid_screens', 10, 500, true)
ON CONFLICT (code) DO NOTHING;
