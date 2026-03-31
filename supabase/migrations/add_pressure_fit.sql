-- Run this in your Supabase SQL editor to enable Pressure-Fit Assessment on results
ALTER TABLE results ADD COLUMN IF NOT EXISTS pressure_fit_score INTEGER;
ALTER TABLE results ADD COLUMN IF NOT EXISTS pressure_fit JSONB;
