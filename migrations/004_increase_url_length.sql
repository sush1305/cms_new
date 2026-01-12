-- 004_increase_url_length.sql
-- Increase URL field length to support longer URLs

ALTER TABLE program_assets ALTER COLUMN url TYPE TEXT;
ALTER TABLE lesson_assets ALTER COLUMN url TYPE TEXT;
