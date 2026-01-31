-- Create normalized_reps table if it doesn't exist
CREATE TABLE IF NOT EXISTS normalized_reps (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_code TEXT NOT NULL,
    name TEXT,
    company_id TEXT REFERENCES companies(id) ON DELETE CASCADE,
    branch_id UUID REFERENCES company_branches(id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(company_id, user_code)
);
-- Enable RLS
ALTER TABLE normalized_reps ENABLE ROW LEVEL SECURITY;
-- RLS Policy
DROP POLICY IF EXISTS "normalized_reps_company_policy" ON normalized_reps;
CREATE POLICY "normalized_reps_company_policy" ON normalized_reps FOR ALL USING (
    company_id = current_setting('app.company_id', true)::TEXT
    OR current_setting('app.is_sysadmin', true)::BOOLEAN = true
);
DROP POLICY IF EXISTS "normalized_reps_public_access" ON normalized_reps;
CREATE POLICY "normalized_reps_public_access" ON normalized_reps FOR ALL USING (true) WITH CHECK (true);