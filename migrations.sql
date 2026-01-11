-- Create users table
CREATE TABLE users (
id VARCHAR(255) PRIMARY KEY,
username VARCHAR(255) NOT NULL,
email VARCHAR(255) UNIQUE NOT NULL,
password VARCHAR(255) NOT NULL,
role VARCHAR(50) NOT NULL CHECK (role IN ('ADMIN', 'EDITOR', 'VIEWER'))
);

-- Create topics table
CREATE TABLE topics (
id VARCHAR(255) PRIMARY KEY,
name VARCHAR(255) NOT NULL
);

-- Create programs table
CREATE TABLE programs (
id VARCHAR(255) PRIMARY KEY,
title VARCHAR(255) NOT NULL,
description TEXT,
language_primary VARCHAR(10) NOT NULL,
languages_available JSONB,
status VARCHAR(50) NOT NULL CHECK (status IN ('DRAFT', 'PUBLISHED', 'ARCHIVED')),
published_at TIMESTAMPTZ,
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
topic_ids JSONB
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
content_type VARCHAR(50) NOT NULL CHECK (content_type IN ('VIDEO', 'ARTICLE', 'QUIZ')),
duration_ms BIGINT,
is_paid BOOLEAN NOT NULL DEFAULT FALSE,
content_language_primary VARCHAR(10) NOT NULL,
content_languages_available JSONB,
content_urls_by_language JSONB,
subtitle_languages JSONB,
subtitle_urls_by_language JSONB,
status VARCHAR(50) NOT NULL CHECK (status IN ('DRAFT', 'PUBLISHED', 'ARCHIVED')),
publish_at TIMESTAMPTZ,
published_at TIMESTAMPTZ,
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
UNIQUE(term_id, lesson_number)
);

-- Create assets table
CREATE TABLE assets (
id VARCHAR(255) PRIMARY KEY,
parent_id VARCHAR(255) NOT NULL,
language VARCHAR(10) NOT NULL,
variant VARCHAR(50) NOT NULL,
asset_type VARCHAR(50) NOT NULL,
url VARCHAR(500) NOT NULL
);
