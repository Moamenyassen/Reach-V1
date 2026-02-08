const { createClient } = require('@supabase/supabase-js');

// Hardcoded for testing purposes
const supabaseUrl = 'https://mpkfvaccnsucdmxxtosu.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1wa2Z2YWNjbnN1Y2RteHh0b3N1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc3NzQ3ODQsImV4cCI6MjA4MzM1MDc4NH0.dlfstdHCzWJF-CMCa93J4RsZvm2nwhqnE5hvZ_8pkEo';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testFetch() {
    console.log('Fetching sample lat/lng to check types...');
    const { data, error } = await supabase
        .from('company_uploaded_data')
        .select('lat, lng')
        .limit(5);

    if (error) {
        console.error('Error fetching data:', error);
    } else {
        console.log('Data Sample:', data);
        if (data && data.length > 0) {
            console.log('Type of lat:', typeof data[0].lat);
            console.log('Type of lng:', typeof data[0].lng);
        }
    }
}

testFetch();
