-- Run this in your Supabase SQL editor to enable Response Integrity fields on results
ALTER TABLE results ADD COLUMN IF NOT EXISTS integrity JSONB;
