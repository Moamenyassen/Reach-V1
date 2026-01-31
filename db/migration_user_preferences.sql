-- Migration: Add User Preferences to app_users
-- Description: Adds a JSONB column to store per-user preferences like theme (dark/light), language, and UI mode.
DO $$ BEGIN IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'app_users'
        AND column_name = 'preferences'
) THEN
ALTER TABLE app_users
ADD COLUMN preferences JSONB DEFAULT '{}'::jsonb;
END IF;
END $$;
-- Update mapping functions in the frontend (services/supabase.ts) to handle this new field.