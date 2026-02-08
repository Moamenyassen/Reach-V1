-- Grant ADMIN privilege to the current user (or specific email)
-- Replace 'moamen_yassen@hotmail.com' with the email you are testing with if different.
UPDATE app_users
SET role = 'ADMIN'
WHERE email = 'moamen_yassen@hotmail.com';
-- Verify the change
SELECT *
FROM app_users
WHERE email = 'moamen_yassen@hotmail.com';