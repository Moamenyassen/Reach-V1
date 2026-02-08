const { createClient } = require('@supabase/supabase-js');

// Hardcoded for testing purposes
const supabaseUrl = 'https://mpkfvaccnsucdmxxtosu.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1wa2Z2YWNjbnN1Y2RteHh0b3N1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc3NzQ3ODQsImV4cCI6MjA4MzM1MDc4NH0.dlfstdHCzWJF-CMCa93J4RsZvm2nwhqnE5hvZ_8pkEo';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testFetch() {
    console.log('Fetching distinct route names...');
    const { data, error } = await supabase
        .from('company_uploaded_data')
        .select('route_name')
        .not('route_name', 'is', null)
        .limit(100);

    if (error) {
        console.error('Error fetching routes:', error);
    } else {
        // Basic dedupe check
        const uniqueRoutes = [...new Set(data.map(d => d.route_name))];
        console.log('Route Sample:', uniqueRoutes);
    }
}

testFetch();
