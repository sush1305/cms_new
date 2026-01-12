-- 002_constraints_triggers.sql

-- Function: check_program_primary_asset_variants
CREATE OR REPLACE FUNCTION check_program_primary_asset_variants() RETURNS TRIGGER AS $$
DECLARE
  required_lang TEXT;
  cnt_portrait INT;
  cnt_landscape INT;
BEGIN
  -- only check when status becomes or is 'published'
  IF (TG_OP = 'INSERT' AND NEW.status = 'published') OR (TG_OP = 'UPDATE' AND NEW.status = 'published' AND (OLD.status IS DISTINCT FROM 'published')) THEN
    required_lang := NEW.language_primary;
    SELECT COUNT(*) INTO cnt_portrait FROM program_assets WHERE program_id = NEW.id AND language = required_lang AND variant = 'portrait';
    SELECT COUNT(*) INTO cnt_landscape FROM program_assets WHERE program_id = NEW.id AND language = required_lang AND variant = 'landscape';
    IF cnt_portrait = 0 OR cnt_landscape = 0 THEN
      RAISE EXCEPTION 'Program publications require portrait and landscape posters for primary language %', required_lang;
    END IF;
  END IF;

  -- ensure published_at is set when status published and not set
  IF NEW.status = 'published' AND NEW.published_at IS NULL THEN
    NEW.published_at := NOW();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_check_program_assets_before_write
BEFORE INSERT OR UPDATE ON programs
FOR EACH ROW EXECUTE FUNCTION check_program_primary_asset_variants();

-- Function: check_lesson_before_publish
CREATE OR REPLACE FUNCTION check_lesson_before_publish() RETURNS TRIGGER AS $$
DECLARE
  prog_language TEXT;
  cnt_prog_portrait INT;
  cnt_prog_landscape INT;
  cnt_lesson_portrait INT;
  cnt_lesson_landscape INT;
  prog_id UUID;
BEGIN
  -- If transitioning to published (either insert or update)
  IF (TG_OP = 'INSERT' AND NEW.status = 'published') OR (TG_OP = 'UPDATE' AND NEW.status = 'published' AND (OLD.status IS DISTINCT FROM 'published')) THEN
    -- find parent program
    SELECT p.id, p.language_primary INTO prog_id, prog_language
      FROM programs p
      JOIN terms t ON t.program_id = p.id
      WHERE t.id = NEW.term_id
      LIMIT 1;

    IF prog_id IS NULL THEN
      RAISE EXCEPTION 'Cannot find parent program for lesson %', NEW.id;
    END IF;

    -- check program assets
    SELECT COUNT(*) INTO cnt_prog_portrait FROM program_assets WHERE program_id = prog_id AND language = prog_language AND variant = 'portrait';
    SELECT COUNT(*) INTO cnt_prog_landscape FROM program_assets WHERE program_id = prog_id AND language = prog_language AND variant = 'landscape';

    IF cnt_prog_portrait = 0 OR cnt_prog_landscape = 0 THEN
      RAISE EXCEPTION 'Parent program lacks required poster variants (portrait/landscape) for language %', prog_language;
    END IF;

    -- check lesson assets for the lesson primary content language
    SELECT COUNT(*) INTO cnt_lesson_portrait FROM lesson_assets WHERE lesson_id = NEW.id AND language = NEW.content_language_primary AND variant = 'portrait';
    SELECT COUNT(*) INTO cnt_lesson_landscape FROM lesson_assets WHERE lesson_id = NEW.id AND language = NEW.content_language_primary AND variant = 'landscape';

    IF cnt_lesson_portrait = 0 OR cnt_lesson_landscape = 0 THEN
      RAISE EXCEPTION 'Lesson publishes require portrait and landscape thumbnails for primary content language %', NEW.content_language_primary;
    END IF;

    -- ensure published_at is set if not
    IF NEW.published_at IS NULL THEN
      NEW.published_at := NOW();
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_check_lesson_before_write
BEFORE INSERT OR UPDATE ON lessons
FOR EACH ROW EXECUTE FUNCTION check_lesson_before_publish();

-- Function to auto-publish program when it gets its first published lesson
CREATE OR REPLACE FUNCTION auto_publish_program_on_first_lesson() RETURNS TRIGGER AS $$
DECLARE
  prog_id UUID;
  pub_count INT;
BEGIN
  -- only on lesson update to published where OLD.status is not published
  IF (TG_OP = 'UPDATE' AND NEW.status = 'published' AND (OLD.status IS DISTINCT FROM 'published')) THEN
    SELECT p.id INTO prog_id
      FROM programs p
      JOIN terms t ON t.program_id = p.id
      WHERE t.id = NEW.term_id
      LIMIT 1;

    IF prog_id IS NOT NULL THEN
      SELECT COUNT(*) INTO pub_count FROM lessons l JOIN terms t ON l.term_id = t.id WHERE t.program_id = prog_id AND l.status = 'published';

      IF pub_count = 1 THEN
        -- this is the first published lesson, publish program if not already
        UPDATE programs SET status = 'published', published_at = COALESCE(published_at, NOW()), updated_at = NOW() WHERE id = prog_id AND status != 'published';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_auto_publish_program_after_lesson_update
AFTER UPDATE ON lessons
FOR EACH ROW EXECUTE FUNCTION auto_publish_program_on_first_lesson();
