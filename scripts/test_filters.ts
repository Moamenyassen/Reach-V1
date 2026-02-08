import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://mpkfvaccnsucdmxxtosu.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1wa2Z2YWNjbnN1Y2RteHh0b3N1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc3NzQ3ODQsImV4cCI6MjA4MzM1MDc4NH0.dlfstdHCzWJF-CMCa93J4RsZvm2nwhqnE5hvZ_8pkEo';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testFilters() {
    const companyId = '31fcb45a-c138-4deb-8755-e9378e95325f';

    console.log(`Testing filters for company ${companyId}...`);

    console.log('\nFetching branches...');
    const { data: branches, error: bError } = await supabase.rpc('fetch_unique_upload_data_with_counts', {
        p_company_id: companyId,
        p_column_name: 'branch_name'
    });
    console.log('Branches:', branches || [], bError || '');

    console.log('\nFetching routes...');
    const { data: routes, error: rError } = await supabase.rpc('fetch_unique_upload_data_with_counts', {
        p_company_id: companyId,
        p_column_name: 'route_name'
    });
    console.log('Routes:', routes?.length || 0, rError || '');
    if (routes && routes.length > 0) console.log('Sample Route:', routes[0]);
}

testFilters();
