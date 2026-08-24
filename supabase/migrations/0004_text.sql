-- Key-value site text, synced from the Airtable "Text" table
-- (e.g. landing-page-introduction).

create table public.content_text (
  key text primary key,
  value text not null
);

alter table public.content_text enable row level security;

create policy "anyone can read site text"
  on public.content_text for select
  to anon, authenticated
  using (true);

-- No client write policies: only the sync (service role) writes.
