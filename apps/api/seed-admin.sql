-- Admin default untuk pengembangan lokal.
-- Login: admin@bukens.test / admin123456
-- (hash password dibuat dengan better-auth/crypto hashPassword)
-- Jalankan: npm run db:seed:admin:local

DELETE FROM accounts WHERE user_id = 'admin-001';
DELETE FROM sessions WHERE user_id = 'admin-001';
DELETE FROM users WHERE id = 'admin-001';

INSERT INTO users (id, name, email, email_verified, role, created_at, updated_at) VALUES
  ('admin-001', 'Bukens Admin', 'admin@bukens.test', 1, 'ADMIN', unixepoch(), unixepoch());

INSERT INTO accounts (id, account_id, provider_id, user_id, password, created_at, updated_at) VALUES
  ('admin-account-001', 'admin-001', 'credential', 'admin-001',
   '2a2a893c8c83d67d14a288653f5d6476:e8bf2a889dcf150144eb4e4e1777d1c690b4017d79bbf7f9c6394bd2f1bc41577ae5b89d221e5223b0924839f18f8ecd138ea1ae3d6d1485c79b05f3c1a7658d',
   unixepoch(), unixepoch());
