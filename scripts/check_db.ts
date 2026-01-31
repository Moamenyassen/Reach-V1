
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://mpkfvaccnsucdmxxtosu.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1wa2Z2YWNjbnN1Y2RteHh0b3N1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc3NzQ3ODQsImV4cCI6MjA4MzM1MDc4NH0.dlfstdHCzWJF-CMCa93J4RsZvm2nwhqnE5hvZ_8pkEo';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkData() {
    const companyId = 'LICENSE-MBN2OM3Q';
    console.log(`Checking data for ${companyId}...`);

    const { data: samples, error } = await supabase
        .from('company_uploaded_data')
        .select('region, branch_name, route_name')
        .eq('company_id', companyId)
        .limit(10);

    if (error) {
        console.error("Error:", error);
        return;
    }

    console.log("Sample rows:", JSON.stringify(samples, null, 2));

    // Check counts
    const { count: regionCount } = await supabase
        .from('company_uploaded_data')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', companyId)
        .not('region', 'is', null);

    const { count: branchCount } = await supabase
        .from('company_uploaded_data')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', companyId)
        .not('branch_name', 'is', null);

    console.log(`Rows with region NOT NULL: ${regionCount}`);
    console.log(`Rows with branch_name NOT NULL: ${branchCount}`);
}

checkData();
