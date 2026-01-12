-- Seed data for Chai Shorts CMS

-- NOTE: IDs use UUIDs for reproducibility. These are deterministic example UUIDs used only for demo/seeding.

-- Users (passwords are bcrypt hash of 'admin123' / 'editor123' / 'viewer123')
INSERT INTO users (id, username, email, password, role) VALUES
('00000000-0000-0000-0000-000000000001', 'Super Admin', 'admin@chaishorts.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin'),
('00000000-0000-0000-0000-000000000002', 'Content Editor', 'editor@chaishorts.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'editor'),
('00000000-0000-0000-0000-000000000003', 'Guest Viewer', 'viewer@chaishorts.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'viewer')
ON CONFLICT DO NOTHING;

-- Topics
INSERT INTO topics (id, name) VALUES
('11111111-1111-1111-1111-111111111111', 'Productivity'),
('11111111-1111-1111-1111-111111111112', 'Lifestyle'),
('11111111-1111-1111-1111-111111111113', 'Coding'),
('11111111-1111-1111-1111-111111111114', 'Finance')
ON CONFLICT DO NOTHING;

-- Programs
-- Insert programs as DRAFT first to avoid publication triggers before assets are present
INSERT INTO programs (id, title, description, language_primary, languages_available, status, published_at, created_at, updated_at) VALUES
('22222222-2222-2222-2222-222222222221', 'Mastering Time Management', 'Learn essential skills for better time management and productivity.', 'en', ARRAY['en','hi'], 'draft', NULL, NOW() - INTERVAL '20 days', NOW() - INTERVAL '10 days'),
('22222222-2222-2222-2222-222222222222', 'Healthy Living Habits', 'Develop sustainable habits for a healthier lifestyle.', 'en', ARRAY['en','hi'], 'draft', NULL, NOW() - INTERVAL '15 days', NOW() - INTERVAL '5 days'),
('22222222-2222-2222-2222-222222222223', 'Introduction to Programming', 'Start your coding journey with fundamental concepts.', 'en', ARRAY['en','hi'], 'draft', NULL, NOW() - INTERVAL '12 days', NOW() - INTERVAL '12 days')
ON CONFLICT DO NOTHING;

-- Program topics
INSERT INTO program_topics (program_id, topic_id) VALUES
('22222222-2222-2222-2222-222222222221','11111111-1111-1111-1111-111111111111'),
('22222222-2222-2222-2222-222222222222','11111111-1111-1111-1111-111111111112'),
('22222222-2222-2222-2222-222222222223','11111111-1111-1111-1111-111111111113')
ON CONFLICT DO NOTHING;

-- Terms
INSERT INTO terms (id, program_id, term_number, title, created_at) VALUES
('33333333-3333-3333-3333-333333333331','22222222-2222-2222-2222-222222222221', 1, 'Foundation of Time Management', NOW() - INTERVAL '20 days'),
('33333333-3333-3333-3333-333333333332','22222222-2222-2222-2222-222222222221', 2, 'Advanced Techniques', NOW() - INTERVAL '18 days'),
('33333333-3333-3333-3333-333333333333','22222222-2222-2222-2222-222222222222', 1, 'Nutrition Basics', NOW() - INTERVAL '15 days'),
('33333333-3333-3333-3333-333333333334','22222222-2222-2222-2222-222222222223', 1, 'Programming Fundamentals', NOW() - INTERVAL '12 days')
ON CONFLICT DO NOTHING;



-- Program assets (posters: portrait and landscape for primary language, plus others)
INSERT INTO program_assets (id, program_id, language, variant, url) VALUES
('55555555-5555-5555-5555-555555555551','22222222-2222-2222-2222-222222222221','en','portrait','https://example.com/poster1-en-portrait.jpg'),
('55555555-5555-5555-5555-555555555552','22222222-2222-2222-2222-222222222221','en','landscape','https://example.com/poster1-en-landscape.jpg'),
('55555555-5555-5555-5555-555555555553','22222222-2222-2222-2222-222222222221','hi','portrait','https://example.com/poster1-hi-portrait.jpg'),
('55555555-5555-5555-5555-555555555554','22222222-2222-2222-2222-222222222222','en','portrait','https://example.com/poster2-en-portrait.jpg'),
('55555555-5555-5555-5555-555555555555','22222222-2222-2222-2222-222222222222','en','landscape','https://example.com/poster2-en-landscape.jpg'),
('55555555-5555-5555-5555-555555555556','22222222-2222-2222-2222-222222222223','en','portrait','https://example.com/poster3-en-portrait.jpg'),
('55555555-5555-5555-5555-555555555557','22222222-2222-2222-2222-222222222223','en','landscape','https://example.com/poster3-en-landscape.jpg')
ON CONFLICT DO NOTHING;

-- Lesson assets moved lower in the file to ensure lessons exist before inserting assets (satisfy FK constraints)

-- Insert lessons
INSERT INTO lessons (id, term_id, lesson_number, title, content_type, duration_ms, is_paid, content_language_primary, content_languages_available, content_urls_by_language, subtitle_languages, subtitle_urls_by_language, status, publish_at, published_at, created_at, updated_at) VALUES
('44444444-4444-4444-4444-444444444441','33333333-3333-3333-3333-333333333331', 1, 'Understanding Your Time', 'video', 1800000, false, 'en', ARRAY['en','hi'], '{"en":"https://example.com/video1-en.mp4","hi":"https://example.com/video1-hi.mp4"}', ARRAY['en','hi'], '{"en":"https://example.com/sub1-en.vtt","hi":"https://example.com/sub1-hi-p.vtt"}', 'draft', NULL, NULL, NOW() - INTERVAL '20 days', NOW() - INTERVAL '10 days'),
('44444444-4444-4444-4444-444444444442','33333333-3333-3333-3333-333333333331', 2, 'Prioritization Techniques', 'article', NULL, false, 'en', ARRAY['en','hi'], '{"en":"https://example.com/article1-en.html","hi":"https://example.com/article1-hi.html"}', NULL, NULL, 'draft', NULL, NULL, NOW() - INTERVAL '19 days', NOW() - INTERVAL '9 days'),
('44444444-4444-4444-4444-444444444443','33333333-3333-3333-3333-333333333332', 1, 'Time Blocking Mastery', 'video', 2400000, true, 'en', ARRAY['en','hi'], '{"en":"https://example.com/video2-en.mp4","hi":"https://example.com/video2-hi.mp4"}', ARRAY['en','hi'], '{"en":"https://example.com/sub2-en.vtt","hi":"https://example.com/sub2-hi.vtt"}', 'draft', NULL, NULL, NOW() - INTERVAL '18 days', NOW() - INTERVAL '8 days'),
('44444444-4444-4444-4444-444444444444','33333333-3333-3333-3333-333333333333', 1, 'Balanced Diet Principles', 'video', 1500000, false, 'en', ARRAY['en','hi'], '{"en":"https://example.com/video3-en.mp4","hi":"https://example.com/video3-hi.mp4"}', ARRAY['en','hi'], '{"en":"https://example.com/sub3-en.vtt","hi":"https://example.com/sub3-hi.vtt"}', 'draft', NULL, NULL, NOW() - INTERVAL '15 days', NOW() - INTERVAL '5 days'),
('44444444-4444-4444-4444-444444444445','33333333-3333-3333-3333-333333333334', 1, 'What is Programming?', 'video', 1200000, false, 'en', ARRAY['en','hi'], '{"en":"https://example.com/video4-en.mp4","hi":"https://example.com/video4-hi.mp4"}', ARRAY['en','hi'], '{"en":"https://example.com/sub4-en.vtt","hi":"https://example.com/sub4-hi.vtt"}', 'draft', NULL, NULL, NOW() - INTERVAL '12 days', NOW() - INTERVAL '12 days'),
('44444444-4444-4444-4444-444444444446','33333333-3333-3333-3333-333333333334', 2, 'Variables and Data Types', 'video', 1800000, false, 'en', ARRAY['en','hi'], '{"en":"https://example.com/video5-en.mp4","hi":"https://example.com/video5-hi.mp4"}', ARRAY['en','hi'], '{"en":"https://example.com/sub5-en.vtt","hi":"https://example.com/sub5-hi.vtt"}', 'scheduled', NOW() + INTERVAL '2 minutes', NULL, NOW() - INTERVAL '12 days', NOW() - INTERVAL '12 days')
ON CONFLICT DO NOTHING;

-- Lesson assets (thumbnails: portrait and landscape for primary language)
INSERT INTO lesson_assets (id, lesson_id, language, variant, url) VALUES
('66666666-6666-6666-6666-666666666661','44444444-4444-4444-4444-444444444441','en','portrait','https://example.com/thumb1-en-portrait.jpg'),
('66666666-6666-6666-6666-666666666662','44444444-4444-4444-4444-444444444441','en','landscape','https://example.com/thumb1-en-landscape.jpg'),
('66666666-6666-6666-6666-666666666663','44444444-4444-4444-4444-444444444441','hi','portrait','https://example.com/thumb1-hi-portrait.jpg'),
('66666666-6666-6666-6666-666666666664','44444444-4444-4444-4444-444444444442','en','portrait','https://example.com/thumb2-en-portrait.jpg'),
('66666666-6666-6666-6666-666666666665','44444444-4444-4444-4444-444444444442','en','landscape','https://example.com/thumb2-en-landscape.jpg'),
('66666666-6666-6666-6666-666666666666','44444444-4444-4444-4444-444444444443','en','portrait','https://example.com/thumb3-en-portrait.jpg'),
('66666666-6666-6666-6666-666666666667','44444444-4444-4444-4444-444444444443','en','landscape','https://example.com/thumb3-en-landscape.jpg'),
('66666666-6666-6666-6666-666666666668','44444444-4444-4444-4444-444444444444','en','portrait','https://example.com/thumb4-en-portrait.jpg'),
('66666666-6666-6666-6666-666666666669','44444444-4444-4444-4444-444444444444','en','landscape','https://example.com/thumb4-en-landscape.jpg'),
('66666666-6666-6666-6666-666666666670','44444444-4444-4444-4444-444444444445','en','portrait','https://example.com/thumb5-en-portrait.jpg'),
('66666666-6666-6666-6666-666666666671','44444444-4444-4444-4444-444444444445','en','landscape','https://example.com/thumb5-en-landscape.jpg'),
('66666666-6666-6666-6666-666666666672','44444444-4444-4444-4444-444444444446','en','portrait','https://example.com/thumb6-en-portrait.jpg'),
('66666666-6666-6666-6666-666666666673','44444444-4444-4444-4444-444444444446','en','landscape','https://example.com/thumb6-en-landscape.jpg')
ON CONFLICT DO NOTHING;

-- After assets are present, publish the lessons that should be published (idempotent)
UPDATE lessons SET status = 'published', published_at = NOW() - INTERVAL '10 days' WHERE id = '44444444-4444-4444-4444-444444444441' AND status != 'published';
UPDATE lessons SET status = 'published', published_at = NOW() - INTERVAL '9 days' WHERE id = '44444444-4444-4444-4444-444444444442' AND status != 'published';
UPDATE lessons SET status = 'published', published_at = NOW() - INTERVAL '8 days' WHERE id = '44444444-4444-4444-4444-444444444443' AND status != 'published';
UPDATE lessons SET status = 'published', published_at = NOW() - INTERVAL '5 days' WHERE id = '44444444-4444-4444-4444-444444444444' AND status != 'published';

-- After assets are present, publish the programs that should be published
UPDATE programs SET status = 'published', published_at = NOW() - INTERVAL '10 days' WHERE id = '22222222-2222-2222-2222-222222222221' AND status = 'draft';
UPDATE programs SET status = 'published', published_at = NOW() - INTERVAL '5 days' WHERE id = '22222222-2222-2222-2222-222222222222' AND status = 'draft';
