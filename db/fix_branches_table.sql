DO $$ BEGIN -- 1. Check if 'company_branches' exists
IF NOT EXISTS (
    SELECT
    FROM pg_tables
    WHERE schemaname = 'public'
        AND tablename = 'company_branches'
) THEN -- 2. Check if 'branches' exists to rename
IF EXISTS (
    SELECT
    FROM pg_tables
    WHERE schemaname = 'public'
        AND tablename = 'branches'
) THEN
ALTER TABLE branches
    RENAME TO company_branches;
-- Rename indexes if they exist
ALTER INDEX IF EXISTS idx_branches_code
RENAME TO idx_company_branches_code;
ALTER INDEX IF EXISTS idx_branches_company
RENAME TO idx_company_branches_company;
ELSE -- 3. Create if neither exists
CREATE TABLE company_branches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    code TEXT NOT NULL,
    name_en TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    lat FLOAT,
    lng FLOAT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(company_id, code)
);
-- Create Indexes
CREATE INDEX idx_company_branches_company ON company_branches(company_id);
CREATE INDEX idx_company_branches_code ON company_branches(code);
END IF;
END IF;
-- 4. Enable RLS
ALTER TABLE company_branches ENABLE ROW LEVEL SECURITY;
-- 5. Create/Update Policies (Safe to run even if they exist, but we drop first to be sure)
DROP POLICY IF EXISTS "company_branches_company_policy" ON company_branches;
CREATE POLICY "company_branches_company_policy" ON company_branches FOR ALL USING (
    company_id = current_setting('app.company_id', true)::TEXT
    OR current_setting('app.is_sysadmin', true)::BOOLEAN = true
);
DROP POLICY IF EXISTS "company_branches_public_access" ON company_branches;
CREATE POLICY "company_branches_public_access" ON company_branches FOR ALL USING (true) WITH CHECK (true);
END $$;