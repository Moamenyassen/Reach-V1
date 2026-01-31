-- Add is_registered_customer column to app_users table
ALTER TABLE public.app_users
ADD COLUMN IF NOT EXISTS is_registered_customer BOOLEAN DEFAULT FALSE;
-- Update the view or any RLS if necessary (RLS already handles "true" for reading own user)
-- No RLS update needed for just reading this column as it belongs to the user row.
-- Comment on column
COMMENT ON COLUMN public.app_users.is_registered_customer IS 'Flag indicating if the internal company user has registered as a Reach Partner';