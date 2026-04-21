-- Optional location or site for assessments. Used by the dashboard
-- location filter so users with multiple offices / sites / client sites can
-- slice their dashboard by location. Free-text and nullable; legacy rows
-- keep showing under "All locations".
alter table public.assessments
  add column if not exists location text;

create index if not exists idx_assessments_location
  on public.assessments (user_id, location)
  where location is not null;
