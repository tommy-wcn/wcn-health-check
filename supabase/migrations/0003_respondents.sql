-- Welcome-page respondent info + partner organization list (synced from Airtable).

create table public.partner_organizations (
  id text primary key,
  name text not null,
  position int not null
);

alter table public.partner_organizations enable row level security;

create policy "anyone can read partner organizations"
  on public.partner_organizations for select
  to anon, authenticated
  using (true);

-- No client write policies: only the sync (service role) writes.

alter table public.submissions
  add column respondent_name text check (char_length(respondent_name) <= 200),
  add column respondent_email text check (char_length(respondent_email) <= 320);
