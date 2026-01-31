
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://mpkfvaccnsucdmxxtosu.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1wa2Z2YWNjbnN1Y2RteHh0b3N1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc3NzQ3ODQsImV4cCI6MjA4MzM1MDc4NH0.dlfstdHCzWJF-CMCa93J4RsZvm2nwhqnE5hvZ_8pkEo';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function testRPC() {
    const companyId = 'LICENSE-MBN2OM3Q';
    console.log(`Testing RPC for ${companyId}...`);

    const { data, error } = await supabase.rpc('get_distinct_upload_values', {
        p_company_id: companyId,
        p_column_name: 'region'
    });

    if (error) {
        console.error("RPC Error:", error);
        return;
    }

    console.log("RPC Data:", data);
}

testRPC();
