-- Create route_assignments table
CREATE TABLE IF NOT EXISTS public.route_assignments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id TEXT REFERENCES companies(id) ON DELETE CASCADE,
    route_name TEXT NOT NULL,
    user_id UUID REFERENCES app_users(id) ON DELETE SET NULL, -- If user is deleted, assignment becomes unassigned
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(company_id, route_name) -- Ensure one driver per route per company
);

-- Enable RLS
ALTER TABLE public.route_assignments ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Allow public all route_assignments"
ON public.route_assignments
FOR ALL
USING (true)
WITH CHECK (true);
