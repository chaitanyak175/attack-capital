-- Create demo user for testing
INSERT INTO "users" (id, email, name, "createdAt", "updatedAt") 
VALUES ('demo-user-id', 'demo@attackcapital.com', 'Demo User', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;
