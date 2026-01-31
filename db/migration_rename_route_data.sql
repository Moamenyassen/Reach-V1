-- Rename route_data table to customers
ALTER TABLE IF EXISTS public.route_data RENAME TO customers;

-- Disable RLS on the new table if needed (or ensure policies are carried over)
-- Policies typically carry over, but we might want to check if they need renaming for clarity.
-- For now, just renaming the table is sufficient.
-- If you have specific policies named 'route_data_policy', they will still work but might be confusingly named.

-- Rename policies if desired (Optional, but good practice)
-- DO $$
-- BEGIN
--     IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public select route_data') THEN
--         ALTER POLICY "Allow public select route_data" ON public.customers RENAME TO "Allow public select customers";
--     END IF;
-- END
-- $$;

-- Verify migration
-- SELECT * FROM public.customers LIMIT 1;
