-- Team management. Each account has one owner row plus any number of
-- manager / consultant rows. `account_id` is the owner's auth id and acts as
-- the partition key for everything team-scoped.
--
-- Status transitions:
--   invited  -> active     (when the user accepts via /invite/[id])
--   active   -> suspended  (owner/manager pauses access)
--   any      -> deleted    (row removed)
create table if not exists public.team_members (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references auth.users(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  email text not null,
  name text,
  role text not null default 'consultant'
    check (role in ('owner', 'manager', 'consultant')),
  status text not null default 'invited'
    check (status in ('invited', 'active', 'suspended')),
  invited_by uuid references auth.users(id) on delete set null,
  invited_at timestamptz default now(),
  joined_at timestamptz,
  created_at timestamptz default now(),
  unique (account_id, email)
);

create index if not exists idx_team_members_account on public.team_members (account_id);
create index if not exists idx_team_members_user    on public.team_members (user_id);

-- Seed an owner row for every existing user so legacy accounts continue to
-- own their own single-seat team. Uses on conflict to stay idempotent.
insert into public.team_members (account_id, user_id, email, name, role, status, joined_at)
select u.id, u.id, u.email, u.company_name, 'owner', 'active', now()
from public.users u
on conflict (account_id, email) do nothing;

alter table public.team_members enable row level security;

-- Members can read their own team's rows.
drop policy if exists "Team members can read their team" on public.team_members;
create policy "Team members can read their team"
  on public.team_members for select
  using (
    user_id = auth.uid()
    or account_id in (
      select account_id from public.team_members
      where user_id = auth.uid() and status = 'active'
    )
  );

-- Only owner + manager can write. Service-role bypasses RLS for webhooks.
drop policy if exists "Owners and managers can write team" on public.team_members;
create policy "Owners and managers can write team"
  on public.team_members for all
  using (
    exists (
      select 1 from public.team_members t
      where t.account_id = team_members.account_id
        and t.user_id = auth.uid()
        and t.status = 'active'
        and t.role in ('owner', 'manager')
    )
  );
