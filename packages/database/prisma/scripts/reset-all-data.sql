-- Wipes all SoloFlow data (users, companies, invoices, etc.). Schema is kept.
-- Run in Railway → Postgres → Query / Data tab.

UPDATE audit_logs SET "userId" = NULL WHERE "userId" IS NOT NULL;

DELETE FROM organizations;
DELETE FROM users;
DELETE FROM verification_tokens;
