-- Fix missing RLS policies for subscription_plans
-- This allows the app to fetch and delete plans (including for SysAdmin)
-- Enable RLS just in case it wasn't
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;
-- Allow public read access (so anyone can see plans)
DROP POLICY IF EXISTS "Anyone can view plans" ON subscription_plans;
CREATE POLICY "Anyone can view plans" ON subscription_plans FOR
SELECT USING (true);
-- Allow full management (Insert/Update/Delete)
-- In a stricter app this would check for admin role, but matching current "SysAdmin via Anon" pattern:
DROP POLICY IF EXISTS "Anyone can manage plans" ON subscription_plans;
CREATE POLICY "Anyone can manage plans" ON subscription_plans FOR ALL USING (true) WITH CHECK (true);