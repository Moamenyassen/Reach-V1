
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://mpkfvaccnsucdmxxtosu.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1wa2Z2YWNjbnN1Y2RteHh0b3N1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc3NzQ3ODQsImV4cCI6MjA4MzM1MDc4NH0.dlfstdHCzWJF-CMCa93J4RsZvm2nwhqnE5hvZ_8pkEo';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkInsights() {
    console.log('Checking Insights logic...');

    // 1. Check if 'customers' table exists and has data
    const { count, error: countError } = await supabase
        .from('customers')
        .select('*', { count: 'exact', head: true });

    console.log(`'customers' table check: ${countError ? 'Error: ' + countError.message : 'Count: ' + count}`);

    // Company ID from previous successful check
    const companyId = '31fcb45a-c138-4deb-8755-e9378e95325f';

    // 2. Test get_dashboard_stats_from_upload RPC
    console.log(`\nTesting RPC get_dashboard_stats_from_upload for company ${companyId}...`);
    const { data: rpcData, error: rpcError } = await supabase.rpc('get_dashboard_stats_from_upload', {
        p_company_id: companyId
    });

    if (rpcError) {
        console.error('RPC Error:', rpcError);
    } else {
        console.log('RPC Data:', JSON.stringify(rpcData, null, 2));
    }
}

checkInsights();
