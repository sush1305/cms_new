-- Seed initial admin user
INSERT INTO users (id, username, email, password, role) 
VALUES (
  'admin-user-001',
  'admin',
  'admin@chaishorts.com',
  '$2a$10$YourHashedPasswordHere', -- bcryptjs hashed 'admin123'
  'admin'
)
ON CONFLICT (email) DO NOTHING;

-- Seed sample topic
INSERT INTO topics (id, name)
VALUES ('topic-001', 'Educational')
ON CONFLICT (name) DO NOTHING;
