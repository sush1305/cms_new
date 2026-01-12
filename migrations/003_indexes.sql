-- 003_indexes.sql

CREATE INDEX IF NOT EXISTS idx_lessons_status_publish_at ON lessons(status, publish_at);
CREATE INDEX IF NOT EXISTS idx_lessons_term_id_lesson_number ON lessons(term_id, lesson_number);
CREATE INDEX IF NOT EXISTS idx_programs_status_language_published ON programs(status, language_primary, published_at);
CREATE INDEX IF NOT EXISTS idx_program_topics_topic_id ON program_topics(topic_id);
CREATE INDEX IF NOT EXISTS idx_program_assets_program_id ON program_assets(program_id);
CREATE INDEX IF NOT EXISTS idx_lesson_assets_lesson_id ON lesson_assets(lesson_id);

-- Index for fast lookup of scheduled lessons
CREATE INDEX IF NOT EXISTS idx_lessons_scheduled_publish_at ON lessons(status, publish_at) WHERE status = 'scheduled';
