-- Migration to refactor data upload schema by adding dedicated columns for main fields to the customers table.
-- Add dedicated columns for main fields to customers table
ALTER TABLE public.customers
ADD COLUMN IF NOT EXISTS name_ar TEXT,
    ADD COLUMN IF NOT EXISTS branch TEXT,
    ADD COLUMN IF NOT EXISTS phone TEXT,
    ADD COLUMN IF NOT EXISTS district TEXT,
    ADD COLUMN IF NOT EXISTS vat TEXT,
    ADD COLUMN IF NOT EXISTS buyer_id TEXT,
    ADD COLUMN IF NOT EXISTS classification TEXT,
    ADD COLUMN IF NOT EXISTS store_type TEXT,
    ADD COLUMN IF NOT EXISTS day TEXT,
    ADD COLUMN IF NOT EXISTS week TEXT,
    ADD COLUMN IF NOT EXISTS user_code TEXT,
    ADD COLUMN IF NOT EXISTS reach_customer_code TEXT;
-- Create sequence for Reach Customer Code if it doesn't exist
CREATE SEQUENCE IF NOT EXISTS reach_customer_code_seq START 1000;
-- Set default for reach_customer_code to auto-generate
ALTER TABLE public.customers
ALTER COLUMN reach_customer_code
SET DEFAULT (
        'RCH-' || nextval('reach_customer_code_seq')::TEXT
    );
-- Update existing rows to have a reach_customer_code if they are NULL
UPDATE public.customers
SET reach_customer_code = (
        'RCH-' || nextval('reach_customer_code_seq')::TEXT
    )
WHERE reach_customer_code IS NULL;
-- Create indexes for frequently filtered columns to maintain performance
CREATE INDEX IF NOT EXISTS idx_customers_day ON public.customers(day);
CREATE INDEX IF NOT EXISTS idx_customers_week ON public.customers(week);
CREATE INDEX IF NOT EXISTS idx_customers_branch ON public.customers(branch);
CREATE INDEX IF NOT EXISTS idx_customers_user_code ON public.customers(user_code);
COMMENT ON COLUMN public.customers.name_ar IS 'Arabic name of the customer (client_Arabic)';
COMMENT ON COLUMN public.customers.branch IS 'Branch name associated with the customer';
COMMENT ON COLUMN public.customers.phone IS 'Phone number of the customer';
COMMENT ON COLUMN public.customers.district IS 'District area of the customer';
COMMENT ON COLUMN public.customers.vat IS 'VAT number of the customer';
COMMENT ON COLUMN public.customers.buyer_id IS 'Buyer identification number (buyer_identification_no)';
COMMENT ON COLUMN public.customers.classification IS 'Customer classification';
COMMENT ON COLUMN public.customers.store_type IS 'Type of the store';
COMMENT ON COLUMN public.customers.day IS 'Scheduled visit day (Day)';
COMMENT ON COLUMN public.customers.week IS 'Scheduled visit week (Week_Number)';
COMMENT ON COLUMN public.customers.user_code IS 'Sales representative or user code (User_Code)';