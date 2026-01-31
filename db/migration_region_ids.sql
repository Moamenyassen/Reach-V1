-- Add region_ids to app_users for hierarchical persistence
ALTER TABLE public.app_users
ADD COLUMN IF NOT EXISTS region_ids TEXT [];