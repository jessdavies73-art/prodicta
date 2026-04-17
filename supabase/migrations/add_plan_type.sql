-- Distinguishes monthly-subscription accounts from pay-as-you-go accounts
-- that purchase credit bundles on demand.
ALTER TABLE users ADD COLUMN IF NOT EXISTS plan_type TEXT DEFAULT 'subscription';

-- Backfill: any existing row with plan = 'payg' (defensive) should carry plan_type = 'payg'.
UPDATE users SET plan_type = 'payg' WHERE plan = 'payg' AND plan_type IS DISTINCT FROM 'payg';

-- Everything else is treated as subscription (existing rows keep the default).
UPDATE users SET plan_type = 'subscription' WHERE plan_type IS NULL;
