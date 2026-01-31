-- Migration: Add route_name to routes table
-- This renames the 'name' column to 'route_name' for clarity
-- Step 1: Add route_name column if it doesn't exist
ALTER TABLE routes
ADD COLUMN IF NOT EXISTS route_name TEXT;
-- Step 2: Copy data from name to route_name (if name exists)
UPDATE routes
SET route_name = name
WHERE route_name IS NULL
    AND name IS NOT NULL;
-- Step 3: Make route_name NOT NULL after data migration
-- ALTER TABLE routes ALTER COLUMN route_name SET NOT NULL;
-- Step 4: Update unique constraint to use route_name
-- DROP INDEX IF EXISTS routes_name_branch_id_key;
-- CREATE UNIQUE INDEX IF NOT EXISTS routes_route_name_branch_id_key ON routes(route_name, branch_id);
-- Note: Run these manually after verifying data migration