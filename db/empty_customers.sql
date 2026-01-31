-- SQL to empty the customers table and reset the reach customer code sequence.
-- Use this with caution as it will delete ALL customer data for ALL companies.
-- 1. Truncate the customers table
TRUNCATE TABLE public.customers RESTART IDENTITY CASCADE;
-- 2. Reset the reach customer code sequence
ALTER SEQUENCE IF EXISTS reach_customer_code_seq RESTART WITH 1000;