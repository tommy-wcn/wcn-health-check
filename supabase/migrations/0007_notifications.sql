-- Email notification support: admin recipient list (synced from the Airtable
-- "Admins" table) and a notified_at stamp so a submission is only emailed once.

create table public.notification_admins (
  id text primary key,
  name text,
  email text not null,
  position int not null
);

alter table public.notification_admins enable row level security;
-- No policies: only the sync and the notify edge function (service role) touch it.

alter table public.submissions add column notified_at timestamptz;
