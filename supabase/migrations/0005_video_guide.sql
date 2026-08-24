-- Optional per-question video guide URL, synced from the Airtable
-- "Video Guide" column. Shown at the top of the question's meta-category.

alter table public.content_questions add column video_guide text;
