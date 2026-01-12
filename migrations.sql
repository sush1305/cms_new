-- Create users table
CREATE TABLE users (
id VARCHAR(255) PRIMARY KEY,
username VARCHAR(255) NOT NULL,
email VARCHAR(255) UNIQUE NOT NULL,
password VARCHAR(255) NOT NULL,
role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'editor', 'viewer'))
);

-- Create topics table
CREATE TABLE topics (
id VARCHAR(255) PRIMARY KEY,
name VARCHAR(255) UNIQUE NOT NULL
);

-- Create programs table
CREATE TABLE programs (
id VARCHAR(255) PRIMARY KEY,
title VARCHAR(255) NOT NULL,
description TEXT,
language_primary VARCHAR(10) NOT NULL,
languages_available TEXT[] NOT NULL,
status VARCHAR(50) NOT NULL CHECK (status IN ('draft', 'published', 'archived')),
published_at TIMESTAMPTZ,
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
CHECK (language_primary = ANY(languages_available))
);

-- Create program_topics junction table for many-to-many
CREATE TABLE program_topics (
program_id VARCHAR(255) NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
topic_id VARCHAR(255) NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
PRIMARY KEY (program_id, topic_id)
);

-- Create terms table
CREATE TABLE terms (
id VARCHAR(255) PRIMARY KEY,
program_id VARCHAR(255) NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
term_number INTEGER NOT NULL,
title VARCHAR(255) NOT NULL,
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
UNIQUE(program_id, term_number)
);

-- Create lessons table
CREATE TABLE lessons (
id VARCHAR(255) PRIMARY KEY,
term_id VARCHAR(255) NOT NULL REFERENCES terms(id) ON DELETE CASCADE,
lesson_number INTEGER NOT NULL,
title VARCHAR(255) NOT NULL,
content_type VARCHAR(50) NOT NULL CHECK (content_type IN ('video', 'article')),
duration_ms BIGINT CHECK (content_type = 'video' OR duration_ms IS NULL),
is_paid BOOLEAN NOT NULL DEFAULT FALSE,
content_language_primary VARCHAR(10) NOT NULL,
content_languages_available TEXT[] NOT NULL,
content_urls_by_language JSONB NOT NULL,
subtitle_languages TEXT[],
subtitle_urls_by_language JSONB,
status VARCHAR(50) NOT NULL CHECK (status IN ('draft', 'scheduled', 'published', 'archived')),
publish_at TIMESTAMPTZ CHECK (status != 'scheduled' OR publish_at IS NOT NULL),
published_at TIMESTAMPTZ CHECK (status != 'published' OR published_at IS NOT NULL),
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
UNIQUE(term_id, lesson_number),
CHECK (content_language_primary = ANY(content_languages_available))
);

-- Create program_assets table (normalized for posters)
CREATE TABLE program_assets (
id VARCHAR(255) PRIMARY KEY,
program_id VARCHAR(255) NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
language VARCHAR(10) NOT NULL,
variant VARCHAR(50) NOT NULL CHECK (variant IN ('portrait', 'landscape', 'square', 'banner')),
url VARCHAR(500) NOT NULL,
UNIQUE(program_id, language, variant)
);

-- Create lesson_assets table (normalized for thumbnails)
CREATE TABLE lesson_assets (
id VARCHAR(255) PRIMARY KEY,
lesson_id VARCHAR(255) NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
language VARCHAR(10) NOT NULL,
variant VARCHAR(50) NOT NULL CHECK (variant IN ('portrait', 'landscape')),
url VARCHAR(500) NOT NULL,
UNIQUE(lesson_id, language, variant)
);

-- Indexes
CREATE INDEX idx_lessons_status_publish_at ON lessons(status, publish_at);
CREATE INDEX idx_lessons_term_id_lesson_number ON lessons(term_id, lesson_number);
CREATE INDEX idx_programs_status_language_published ON programs(status, language_primary, published_at);
CREATE INDEX idx_program_topics_topic_id ON program_topics(topic_id);
CREATE INDEX idx_program_assets_program_id ON program_assets(program_id);
CREATE INDEX idx_lesson_assets_lesson_id ON lesson_assets(lesson_id);
