-- Migration: Add lat/lng to branches table
ALTER TABLE branches
ADD COLUMN IF NOT EXISTS lat DOUBLE PRECISION;
ALTER TABLE branches
ADD COLUMN IF NOT EXISTS lng DOUBLE PRECISION;
-- Comment for clarity
COMMENT ON COLUMN branches.lat IS 'Latitude of the branch location';
COMMENT ON COLUMN branches.lng IS 'Longitude of the branch location';