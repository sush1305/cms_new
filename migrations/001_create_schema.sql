-- 001_create_schema.sql

-- Enable pgcrypto for UUID generation
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- migrations table
CREATE TABLE IF NOT EXISTS migrations (
  id VARCHAR(255) PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Users
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'editor', 'viewer'))
);

-- Topics
CREATE TABLE IF NOT EXISTS topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) UNIQUE NOT NULL
);

-- Programs
CREATE TABLE IF NOT EXISTS programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  language_primary VARCHAR(10) NOT NULL,
  languages_available TEXT[] NOT NULL,
  status VARCHAR(50) NOT NULL CHECK (status IN ('draft', 'published', 'archived')),
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (language_primary = ANY(languages_available)),
  CHECK (status != 'published' OR published_at IS NOT NULL)
);

-- Program <-> Topic
CREATE TABLE IF NOT EXISTS program_topics (
  program_id UUID NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
  topic_id UUID NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  PRIMARY KEY (program_id, topic_id)
);

-- Terms
CREATE TABLE IF NOT EXISTS terms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
  term_number INTEGER NOT NULL,
  title VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(program_id, term_number)
);

-- Lessons
CREATE TABLE IF NOT EXISTS lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  term_id UUID NOT NULL REFERENCES terms(id) ON DELETE CASCADE,
  lesson_number INTEGER NOT NULL,
  title VARCHAR(255) NOT NULL,
  content_type VARCHAR(50) NOT NULL CHECK (content_type IN ('video', 'article')),
  duration_ms BIGINT,
  is_paid BOOLEAN NOT NULL DEFAULT FALSE,
  content_language_primary VARCHAR(10) NOT NULL,
  content_languages_available TEXT[] NOT NULL,
  content_urls_by_language JSONB NOT NULL,
  subtitle_languages TEXT[],
  subtitle_urls_by_language JSONB,
  status VARCHAR(50) NOT NULL CHECK (status IN ('draft', 'scheduled', 'published', 'archived')),
  publish_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(term_id, lesson_number),
  CHECK (content_language_primary = ANY(content_languages_available)),
  CHECK (status != 'scheduled' OR publish_at IS NOT NULL),
  CHECK (status != 'published' OR published_at IS NOT NULL),
  CHECK (content_type != 'video' OR duration_ms IS NOT NULL)
);

-- Program assets (posters)
CREATE TABLE IF NOT EXISTS program_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
  language VARCHAR(10) NOT NULL,
  variant VARCHAR(50) NOT NULL CHECK (variant IN ('portrait', 'landscape', 'square', 'banner')),
  url VARCHAR(500) NOT NULL,
  UNIQUE(program_id, language, variant)
);

-- Lesson assets (thumbnails)
CREATE TABLE IF NOT EXISTS lesson_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  language VARCHAR(10) NOT NULL,
  variant VARCHAR(50) NOT NULL CHECK (variant IN ('portrait', 'landscape')),
  url VARCHAR(500) NOT NULL,
  UNIQUE(lesson_id, language, variant)
);
