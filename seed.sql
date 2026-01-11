-- Seed data for Chai Shorts CMS

-- Insert users
INSERT INTO users (id, username, email, password, role) VALUES
('u1', 'Super Admin', 'admin@chaishorts.com', 'admin123', 'ADMIN'),
('u2', 'Content Editor', 'editor@chaishorts.com', 'editor123', 'EDITOR'),
('u3', 'Guest Viewer', 'viewer@chaishorts.com', 'viewer123', 'VIEWER');

-- Insert topics
INSERT INTO topics (id, name) VALUES
('t1', 'Productivity'),
('t2', 'Lifestyle'),
('t3', 'Coding'),
('t4', 'Finance');

-- Insert programs
INSERT INTO programs (id, title, description, language_primary, languages_available, status, published_at, created_at, updated_at, topic_ids) VALUES
('p1', 'Mastering Time Management', 'Learn essential skills for better time management and productivity.', 'en', '["en", "hi"]', 'PUBLISHED', '2024-01-15T10:00:00Z', '2024-01-10T09:00:00Z', '2024-01-15T10:00:00Z', '["t1"]'),
('p2', 'Healthy Living Habits', 'Develop sustainable habits for a healthier lifestyle.', 'en', '["en", "hi"]', 'PUBLISHED', '2024-01-20T11:00:00Z', '2024-01-12T10:00:00Z', '2024-01-20T11:00:00Z', '["t2"]'),
('p3', 'Introduction to Programming', 'Start your coding journey with fundamental concepts.', 'en', '["en", "hi"]', 'DRAFT', NULL, '2024-01-14T12:00:00Z', '2024-01-14T12:00:00Z', '["t3"]');

-- Insert terms
INSERT INTO terms (id, program_id, term_number, title, created_at) VALUES
('term1', 'p1', 1, 'Foundation of Time Management', '2024-01-10T09:00:00Z'),
('term2', 'p1', 2, 'Advanced Techniques', '2024-01-11T09:00:00Z'),
('term3', 'p2', 1, 'Nutrition Basics', '2024-01-12T10:00:00Z'),
('term4', 'p3', 1, 'Programming Fundamentals', '2024-01-14T12:00:00Z');

-- Insert lessons
INSERT INTO lessons (id, term_id, lesson_number, title, content_type, duration_ms, is_paid, content_language_primary, content_languages_available, content_urls_by_language, subtitle_languages, subtitle_urls_by_language, status, publish_at, published_at, created_at, updated_at) VALUES
('l1', 'term1', 1, 'Understanding Your Time', 'VIDEO', 1800000, false, 'en', '["en", "hi"]', '{"en": "https://example.com/video1-en.mp4", "hi": "https://example.com/video1-hi.mp4"}', '["en", "hi"]', '{"en": "https://example.com/sub1-en.vtt", "hi": "https://example.com/sub1-hi.vtt"}', 'PUBLISHED', NULL, '2024-01-15T10:00:00Z', '2024-01-10T09:00:00Z', '2024-01-15T10:00:00Z'),
('l2', 'term1', 2, 'Prioritization Techniques', 'ARTICLE', NULL, false, 'en', '["en", "hi"]', '{"en": "https://example.com/article1-en.html", "hi": "https://example.com/article1-hi.html"}', '[]', '{}', 'PUBLISHED', NULL, '2024-01-16T10:00:00Z', '2024-01-11T09:00:00Z', '2024-01-16T10:00:00Z'),
('l3', 'term2', 1, 'Time Blocking Mastery', 'VIDEO', 2400000, true, 'en', '["en", "hi"]', '{"en": "https://example.com/video2-en.mp4", "hi": "https://example.com/video2-hi.mp4"}', '["en", "hi"]', '{"en": "https://example.com/sub2-en.vtt", "hi": "https://example.com/sub2-hi.vtt"}', 'PUBLISHED', NULL, '2024-01-17T10:00:00Z', '2024-01-12T09:00:00Z', '2024-01-17T10:00:00Z'),
('l4', 'term3', 1, 'Balanced Diet Principles', 'VIDEO', 1500000, false, 'en', '["en", "hi"]', '{"en": "https://example.com/video3-en.mp4", "hi": "https://example.com/video3-hi.mp4"}', '["en", "hi"]', '{"en": "https://example.com/sub3-en.vtt", "hi": "https://example.com/sub3-hi.vtt"}', 'PUBLISHED', NULL, '2024-01-20T11:00:00Z', '2024-01-13T10:00:00Z', '2024-01-20T11:00:00Z'),
('l5', 'term4', 1, 'What is Programming?', 'VIDEO', 1200000, false, 'en', '["en", "hi"]', '{"en": "https://example.com/video4-en.mp4", "hi": "https://example.com/video4-hi.mp4"}', '["en", "hi"]', '{"en": "https://example.com/sub4-en.vtt", "hi": "https://example.com/sub4-hi.vtt"}', 'DRAFT', NULL, NULL, '2024-01-14T12:00:00Z', '2024-01-14T12:00:00Z');

-- Insert assets
INSERT INTO assets (id, parent_id, language, variant, asset_type, url) VALUES
('a1', 'p1', 'en', 'PORTRAIT', 'POSTER', 'https://example.com/poster1-en-portrait.jpg'),
('a2', 'p1', 'hi', 'PORTRAIT', 'POSTER', 'https://example.com/poster1-hi-portrait.jpg'),
('a3', 'p1', 'en', 'LANDSCAPE', 'POSTER', 'https://example.com/poster1-en-landscape.jpg'),
('a4', 'p2', 'en', 'PORTRAIT', 'POSTER', 'https://example.com/poster2-en-portrait.jpg'),
('a5', 'l1', 'en', 'THUMBNAIL', 'THUMBNAIL', 'https://example.com/thumb1-en.jpg'),
('a6', 'l1', 'hi', 'THUMBNAIL', 'THUMBNAIL', 'https://example.com/thumb1-hi.jpg');
