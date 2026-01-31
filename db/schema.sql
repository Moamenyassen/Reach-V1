-- ==========================================
-- REACH AI SCHEMA MIGRATION
-- ==========================================

-- 1. RESET Reach Customers Table (Required to fix "full_name" legacy issues)
DROP TABLE IF EXISTS public.reach_customers CASCADE;

CREATE TABLE public.reach_customers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT NOT NULL,
    country TEXT NOT NULL,
    role TEXT NOT NULL,
    
    -- Step 2: Company / Trial Data (Nullable initially)
    company_name TEXT,
    industry TEXT,
    branches_count INTEGER,
    routes_count INTEGER,
    target_customers_type TEXT[], 
    target_customers_count INTEGER,
    
    status TEXT DEFAULT 'lead', 
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.reach_customers ENABLE ROW LEVEL SECURITY;

-- 2. Policies

-- INSERT: Allow anyone to create a lead
CREATE POLICY "Allow public insert to reach_customers" 
ON public.reach_customers 
FOR INSERT 
TO public 
WITH CHECK (true);

-- SELECT: Allow anyone to read (needed for returning ID to client)
CREATE POLICY "Allow public select to reach_customers" 
ON public.reach_customers 
FOR SELECT 
TO public 
USING (true);

-- UPDATE: Allow anyone to update (needed for Step 2 completion)
CREATE POLICY "Allow public update to reach_customers" 
ON public.reach_customers 
FOR UPDATE 
TO public 
USING (true);


-- 3. System Settings Table (Idempotent)
CREATE TABLE IF NOT EXISTS public.system_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Reset policies for settings to ensure correctness
DROP POLICY IF EXISTS "Allow public read system_settings" ON public.system_settings;
DROP POLICY IF EXISTS "Allow public upsert system_settings" ON public.system_settings;

CREATE POLICY "Allow public read system_settings" 
ON public.system_settings 
FOR SELECT 
USING (true);

CREATE POLICY "Allow public upsert system_settings" 
ON public.system_settings 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- 4. Promo Codes Table
CREATE TABLE IF NOT EXISTS public.promo_codes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    discount_percent INTEGER NOT NULL,
    description TEXT,
    expires_at TIMESTAMP WITH TIME ZONE,
    usage_count INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;

-- Allow public read (needed for validation)
CREATE POLICY "Allow public read promo_codes" 
ON public.promo_codes 
FOR SELECT 
USING (true);

-- Allow public write (for SysAdmin management - simplified for this demo context)
CREATE POLICY "Allow public all promo_codes" 
ON public.promo_codes 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- 5. Promo Usage Logs
CREATE TABLE IF NOT EXISTS public.promo_usage_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    promo_code_id UUID REFERENCES public.promo_codes(id) ON DELETE SET NULL,
    company_name TEXT NOT NULL,
    plan_id TEXT NOT NULL,
    amount DECIMAL NOT NULL,
    used_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.promo_usage_logs ENABLE ROW LEVEL SECURITY;

-- Allow public insert (server/anonymous logged usage)
CREATE POLICY "Allow public insert usage" 
ON public.promo_usage_logs 
FOR INSERT 
WITH CHECK (true);

-- Allow public read (for SysAdmin management)
CREATE POLICY "Allow public read usage" 
ON public.promo_usage_logs 
FOR SELECT 
USING (true);

-- 6. Subscription Plans Table (Dynamic Pricing & Limits)
CREATE TABLE IF NOT EXISTS public.subscription_plans (
    id TEXT PRIMARY KEY, -- 'starter', 'growth', 'elite'
    name TEXT NOT NULL,
    description TEXT,
    price_monthly DECIMAL NOT NULL,
    price_yearly DECIMAL NOT NULL,
    currency TEXT DEFAULT 'SAR',
    features JSONB DEFAULT '[]'::jsonb, -- Array of feature strings
    disabled_features JSONB DEFAULT '[]'::jsonb, -- Array of disabled feature strings
    limits JSONB DEFAULT '{}'::jsonb, -- { routes: 1200, users: 10, storage_gb: 5, market_scanner_cap: 50 }
    ui_config JSONB DEFAULT '{}'::jsonb, -- { color: '...', icon: '...', isPopular: false }
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;

-- Allow public read (for ReachPricing page to fetch)
CREATE POLICY "Allow public read plans" 
ON public.subscription_plans 
FOR SELECT 
USING (true);

-- Allow public update (for SysAdmin to edit - simplified for demo)
CREATE POLICY "Allow public update plans" 
ON public.subscription_plans 
FOR UPDATE 
USING (true)
WITH CHECK (true);

-- Allow public insert (for seeding/admin)
CREATE POLICY "Allow public insert plans" 
ON public.subscription_plans 
FOR INSERT 
WITH CHECK (true);

-- SEED DATA (upsert)
INSERT INTO public.subscription_plans (id, name, description, price_monthly, price_yearly, features, disabled_features, limits, ui_config)
VALUES 
(
    'starter', 
    'Starter', 
    'Perfect for small businesses just starting out.',
    19.99, 
    14.99, 
    '["Basic Route Planning", "Standard Map View", "Mobile App Access", "Email Support"]'::jsonb,
    '["Advanced Analytics", "API Access", "Priority Support"]'::jsonb,
    '{"routes": 1250, "users": 1, "market_scanner_cap": 0, "customers": 2500}'::jsonb,
    '{"color": "from-blue-400 to-cyan-400", "icon": "Rocket"}'::jsonb
),
(
    'growth', 
    'Growth', 
    'Scale your operations with advanced tools.',
    29.99, 
    22.99, 
    '["Advanced Route Optimization", "Performance Reports & Analytics", "Data Export (Excel/CSV)", "Priority Email Support", "Multiple Branch Management"]'::jsonb,
    '["Dedicated Account Manager", "Custom API Integration"]'::jsonb,
    '{"routes": 7100, "users": 5, "market_scanner_cap": 50, "customers": 10000}'::jsonb,
    '{"color": "from-amber-400 to-orange-500", "icon": "Zap", "borderColor": "border-amber-500/50", "isPopular": true}'::jsonb
),
(
    'elite', 
    'Elite', 
    'Maximum power for enterprise logistics.',
    39.99, 
    29.99, 
    '["Everything in Growth", "Full API Access", "Real-time Fleet Tracking", "Dedicated Account Manager", "Custom Onboarding", "SLA Guarantees"]'::jsonb,
    '[]'::jsonb,
    '{"routes": "Unlimited", "users": "Unlimited", "market_scanner_cap": "Unlimited", "customers": "Unlimited"}'::jsonb,
    '{"color": "from-fuchsia-500 to-purple-600", "icon": "Crown"}'::jsonb
)
ON CONFLICT (id) DO UPDATE 
SET 
    price_monthly = EXCLUDED.price_monthly,
    price_yearly = EXCLUDED.price_yearly,
    limits = EXCLUDED.limits,
    features = EXCLUDED.features;

