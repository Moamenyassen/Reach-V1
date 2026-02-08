import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://mpkfvaccnsucdmxxtosu.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1wa2Z2YWNjbnN1Y2RteHh0b3N1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc3NzQ3ODQsImV4cCI6MjA4MzM1MDc4NH0.dlfstdHCzWJF-CMCa93J4RsZvm2nwhqnE5hvZ_8pkEo';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkData() {
    console.log('Checking company_branches schema...');

    const { data: sampleRow, error } = await supabase
        .from('company_branches')
        .select('*')
        .limit(1);

    if (error) {
        console.error('Error fetching row:', error);
    } else if (sampleRow && sampleRow.length > 0) {
        console.log('Sample Row Keys:', Object.keys(sampleRow[0]));
        console.log('Sample Row Data:', sampleRow[0]);
    } else {
        console.log('No data found in company_branches.');
    }
}

checkData();
