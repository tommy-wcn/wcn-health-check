-- WCN Organizational Health Check — initial schema
-- Run once in the Supabase dashboard: SQL Editor → New query → paste → Run.

create table public.submissions (
  id uuid primary key,
  org_name text not null check (char_length(org_name) between 1 and 200),
  language text not null default 'en',
  created_at timestamptz not null default now()
);

create table public.answers (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.submissions (id) on delete cascade,
  question_id text not null,
  level int not null check (level between 1 and 4),
  note text check (char_length(note) <= 2000),
  unique (submission_id, question_id)
);

create index answers_submission_id_idx on public.answers (submission_id);

alter table public.submissions enable row level security;
alter table public.answers enable row level security;

-- Anyone (anonymous respondents) may submit…
create policy "anon can insert submissions"
  on public.submissions for insert
  to anon
  with check (true);

create policy "anon can insert answers"
  on public.answers for insert
  to anon
  with check (true);

-- …but only signed-in WCN staff may read.
create policy "staff can read submissions"
  on public.submissions for select
  to authenticated
  using (true);

create policy "staff can read answers"
  on public.answers for select
  to authenticated
  using (true);

-- No update/delete policies: data is append-only for everyone, including staff.
