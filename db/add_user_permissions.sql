-- Add missing columns to app_users table for user permissions
-- Safe/Idempotent migration
DO $$ BEGIN BEGIN
ALTER TABLE app_users
ADD COLUMN route_ids TEXT [];
EXCEPTION
WHEN duplicate_column THEN NULL;
END;
BEGIN
ALTER TABLE app_users
ADD COLUMN region_ids TEXT [];
EXCEPTION
WHEN duplicate_column THEN NULL;
END;
BEGIN
ALTER TABLE app_users
ADD COLUMN rep_codes TEXT [];
EXCEPTION
WHEN duplicate_column THEN NULL;
END;
END $$;
COMMENT ON COLUMN app_users.route_ids IS 'Specific routes this user is allowed to access/manage';
COMMENT ON COLUMN app_users.region_ids IS 'Specific regions this user is allowed to access/manage';
COMMENT ON COLUMN app_users.rep_codes IS 'Specific representatives this user is allowed to manage';