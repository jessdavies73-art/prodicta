-- SSP Alerts table: tracks sickness reports for agency temp workers
CREATE TABLE IF NOT EXISTS ssp_alerts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  candidate_id TEXT,
  assessment_id TEXT,
  worker_name TEXT,
  role_title TEXT,
  client_company TEXT,
  reported_sick_date DATE,
  reported_at TIMESTAMP DEFAULT NOW(),
  ssp_check_completed BOOLEAN DEFAULT false,
  ssp_check_completed_at TIMESTAMP,
  ssp_record_id UUID REFERENCES ssp_records(id),
  reminder_sent BOOLEAN DEFAULT false,
  reminder_sent_at TIMESTAMP,
  resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMP
);

-- Index for cron job: find overdue uncompleted alerts efficiently
CREATE INDEX IF NOT EXISTS idx_ssp_alerts_pending ON ssp_alerts (ssp_check_completed, reminder_sent, reported_at)
  WHERE ssp_check_completed = false AND reminder_sent = false;

-- Index for dashboard: active alerts per user
CREATE INDEX IF NOT EXISTS idx_ssp_alerts_user_active ON ssp_alerts (user_id, resolved)
  WHERE resolved = false;

-- RLS
ALTER TABLE ssp_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own ssp_alerts"
  ON ssp_alerts FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own ssp_alerts"
  ON ssp_alerts FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own ssp_alerts"
  ON ssp_alerts FOR UPDATE USING (auth.uid() = user_id);
