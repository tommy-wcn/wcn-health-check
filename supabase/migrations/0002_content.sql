-- Assessment content, synced from Airtable (categories → questions → stage rubrics).
-- The app reads this at runtime; writes happen only via the sync (service role).

create table public.content_categories (
  id text primary key,
  name text not null,
  position int not null
);

create table public.content_questions (
  id text primary key,
  category_id text not null references public.content_categories (id) on delete cascade,
  title text not null,
  position int not null,
  -- Array of 4 arrays of bullet strings, Planting → Harvesting
  stage_descriptions jsonb not null
);

create index content_questions_category_idx on public.content_questions (category_id);

alter table public.content_categories enable row level security;
alter table public.content_questions enable row level security;

-- Content is public: anyone taking the health check reads it.
create policy "anyone can read categories"
  on public.content_categories for select
  to anon, authenticated
  using (true);

create policy "anyone can read questions"
  on public.content_questions for select
  to anon, authenticated
  using (true);

-- No insert/update/delete policies: only the sync (service role, bypasses RLS) writes.
