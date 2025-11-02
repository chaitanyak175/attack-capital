-- Delete existing user if any
DELETE FROM "users" WHERE email = 'demo@attackcapital.com';

-- Insert user with correct ID
INSERT INTO "users" (id, email, name, "createdAt", "updatedAt") 
VALUES ('demo-user-id', 'demo@attackcapital.com', 'Demo User', NOW(), NOW());

-- Verify the user was created
SELECT * FROM "users" WHERE id = 'demo-user-id';
