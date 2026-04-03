-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Users table (mirrors Supabase Auth)
create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  company_name text,
  account_type text default 'employer' check (account_type in ('employer', 'agency')),
  plan text default 'starter' check (plan in ('starter', 'growth', 'scale', 'founding')),
  onboarding_complete boolean default true,
  created_at timestamp with time zone default now()
);

-- Assessments table
create table if not exists public.assessments (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users(id) on delete cascade,
  role_title text not null,
  job_description text not null,
  detected_role_type text default 'general',
  scenarios jsonb,
  skill_weights jsonb default '{"Communication": 25, "Problem solving": 25, "Prioritisation": 25, "Leadership": 25}'::jsonb,
  created_at timestamp with time zone default now(),
  status text default 'active' check (status in ('active', 'closed'))
);

-- Candidates table
create table if not exists public.candidates (
  id uuid primary key default uuid_generate_v4(),
  assessment_id uuid not null references public.assessments(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  name text not null,
  email text not null,
  unique_link text not null unique,
  status text default 'sent' check (status in ('sent', 'pending', 'completed', 'archived')),
  invited_at timestamp with time zone default now(),
  completed_at timestamp with time zone
);

-- Responses table
create table if not exists public.responses (
  id uuid primary key default uuid_generate_v4(),
  candidate_id uuid not null references public.candidates(id) on delete cascade,
  scenario_index integer not null check (scenario_index >= 0 and scenario_index <= 3),
  response_text text not null,
  time_taken_seconds integer,
  created_at timestamp with time zone default now()
);

-- Results table
create table if not exists public.results (
  id uuid primary key default uuid_generate_v4(),
  candidate_id uuid not null references public.candidates(id) on delete cascade,
  overall_score integer check (overall_score >= 0 and overall_score <= 100),
  scores jsonb,
  score_narratives jsonb,
  strengths jsonb,
  watchouts jsonb,
  ai_summary text,
  risk_level text check (risk_level in ('Very Low', 'Low', 'Medium', 'High')),
  risk_reason text,
  onboarding_plan jsonb,
  interview_questions jsonb,
  percentile text,
  created_at timestamp with time zone default now()
);

-- Benchmarks table
create table if not exists public.benchmarks (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users(id) on delete cascade,
  skill_name text not null,
  threshold integer,
  updated_at timestamp with time zone default now(),
  unique(user_id, skill_name)
);

-- =====================
-- Row Level Security
-- =====================

alter table public.users enable row level security;
alter table public.assessments enable row level security;
alter table public.candidates enable row level security;
alter table public.responses enable row level security;
alter table public.results enable row level security;
alter table public.benchmarks enable row level security;

-- Users: can only see/modify own record
create policy "Users can view own profile" on public.users
  for select using (auth.uid() = id);

create policy "Users can update own profile" on public.users
  for update using (auth.uid() = id);

create policy "Users can insert own profile" on public.users
  for insert with check (auth.uid() = id);

-- Assessments: only owner
create policy "Employers can manage own assessments" on public.assessments
  for all using (auth.uid() = user_id);

-- Candidates: employer can see their own candidates
create policy "Employers can manage own candidates" on public.candidates
  for all using (auth.uid() = user_id);

-- Candidates: allow anonymous access via unique_link (for candidate assessment page)
create policy "Candidates can view own record via unique_link" on public.candidates
  for select using (true);

-- Responses: employer can see responses for their candidates
create policy "Employers can view responses" on public.responses
  for select using (
    exists (
      select 1 from public.candidates c
      where c.id = responses.candidate_id and c.user_id = auth.uid()
    )
  );

-- Responses: allow inserts from anyone (candidate submitting)
create policy "Anyone can insert responses" on public.responses
  for insert with check (true);

-- Results: only employer
create policy "Employers can view own results" on public.results
  for select using (
    exists (
      select 1 from public.candidates c
      where c.id = results.candidate_id and c.user_id = auth.uid()
    )
  );

-- Results: allow service role to insert (via API)
create policy "Service role can insert results" on public.results
  for insert with check (true);

-- Benchmarks: only owner
create policy "Employers can manage own benchmarks" on public.benchmarks
  for all using (auth.uid() = user_id);

-- Candidate Outcomes table
create table if not exists public.candidate_outcomes (
  id uuid default gen_random_uuid() primary key,
  candidate_id uuid not null references public.candidates(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  outcome text,
  outcome_date date,
  notes text,
  client_name text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(candidate_id, user_id)
);
alter table public.candidate_outcomes enable row level security;
create policy "Users can manage own candidate outcomes"
  on public.candidate_outcomes for all using (user_id = auth.uid());

-- Accountability Records table
create table if not exists public.accountability_records (
  id uuid default gen_random_uuid() primary key,
  candidate_id uuid not null references public.candidates(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  generated_at timestamptz not null default now(),
  key_findings text,
  watch_outs text,
  recommended_actions text,
  shared_with_client_at timestamptz,
  created_at timestamptz default now()
);
alter table public.accountability_records enable row level security;
create policy "Users can manage own accountability records"
  on public.accountability_records for all using (user_id = auth.uid());

-- =====================
-- Indexes
-- =====================
create index if not exists idx_assessments_user_id on public.assessments(user_id);
create index if not exists idx_candidates_assessment_id on public.candidates(assessment_id);
create index if not exists idx_candidates_user_id on public.candidates(user_id);
create index if not exists idx_candidates_unique_link on public.candidates(unique_link);
create index if not exists idx_responses_candidate_id on public.responses(candidate_id);
create index if not exists idx_results_candidate_id on public.results(candidate_id);
create index if not exists idx_benchmarks_user_id on public.benchmarks(user_id);
create index if not exists idx_candidate_outcomes_candidate_id on public.candidate_outcomes(candidate_id);
create index if not exists idx_candidate_outcomes_user_id on public.candidate_outcomes(user_id);
create index if not exists idx_accountability_records_candidate_id on public.accountability_records(candidate_id);
create index if not exists idx_accountability_records_user_id on public.accountability_records(user_id);
