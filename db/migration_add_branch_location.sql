-- Migration to add latitude and longitude to branches table
ALTER TABLE branches
ADD COLUMN IF NOT EXISTS lat DECIMAL(10, 8);
ALTER TABLE branches
ADD COLUMN IF NOT EXISTS lng DECIMAL(11, 8);
-- Add comment for clarity
COMMENT ON COLUMN branches.lat IS 'Latitude of the branch/depot';
COMMENT ON COLUMN branches.lng IS 'Longitude of the branch/depot';