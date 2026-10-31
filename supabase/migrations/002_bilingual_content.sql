-- Round 2: bilingual (ID/EN) content fields and image slots. Safe to run on a project created from schema.sql v1.
alter table settings add column if not exists tagline_en text, add column if not exists announcement_en text,
  add column if not exists hero_image_url text, add column if not exists about_image_url text;
alter table categories add column if not exists name_en text, add column if not exists description_en text, add column if not exists image_url text;
alter table products add column if not exists description_en text, add column if not exists origin_en text, add column if not exists storage_note_en text;
alter table variants add column if not exists label_en text;
alter table prep_options add column if not exists label_en text, add column if not exists note_en text;
-- Then re-run seed.sql to load English copy and the two value boxes (it upserts by id).
