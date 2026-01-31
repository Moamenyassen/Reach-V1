import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://mpkfvaccnsucdmxxtosu.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1wa2Z2YWNjbnN1Y2RteHh0b3N1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc3NzQ3ODQsImV4cCI6MjA4MzM1MDc4NH0.dlfstdHCzWJF-CMCa93J4RsZvm2nwhqnE5hvZ_8pkEo';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkRoutes() {
    const companyId = 'LICENSE-MBN2OM3Q';

    // Get distinct routes for JEDDAH CONSUMER
    const { data: routes, error } = await supabase
        .from('company_uploaded_data')
        .select('route_name')
        .eq('company_id', companyId)
        .eq('branch_name', 'JEDDAH CONSUMER')
        .limit(100);

    if (error) {
        console.error("Error:", error);
        return;
    }

    // Get distinct routes
    const distinctRoutes = Array.from(new Set(routes?.map(r => r.route_name).filter(Boolean)));
    console.log('JEDDAH CONSUMER routes:', distinctRoutes.slice(0, 20));
    console.log('Total distinct routes:', distinctRoutes.length);

    // Also test the filter query
    console.log('\n--- Testing Filter Query ---');
    const testRoute = distinctRoutes[0];
    console.log('Testing with route:', testRoute);

    const { data: testData, error: testError } = await supabase
        .from('company_uploaded_data')
        .select('*')
        .eq('company_id', companyId)
        .eq('branch_name', 'JEDDAH CONSUMER')
        .eq('route_name', testRoute)
        .limit(5);

    if (testError) {
        console.error("Filter query error:", testError);
    } else {
        console.log('Test query returned:', testData.length, 'rows');
        if (testData.length > 0) {
            console.log('Sample row keys:', Object.keys(testData[0]));
        }
    }
}

checkRoutes();
