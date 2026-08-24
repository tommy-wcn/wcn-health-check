-- Intro text and video move from questions to categories, synced from the
-- new Airtable "Meta Category" table (Intro Text / Video Overview columns).

alter table public.content_categories
  add column intro_text text,
  add column video_guide text;

alter table public.content_questions drop column video_guide;
