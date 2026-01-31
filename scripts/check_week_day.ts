import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://mpkfvaccnsucdmxxtosu.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1wa2Z2YWNjbnN1Y2RteHh0b3N1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc3NzQ3ODQsImV4cCI6MjA4MzM1MDc4NH0.dlfstdHCzWJF-CMCa93J4RsZvm2nwhqnE5hvZ_8pkEo';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkWeekDay() {
    const companyId = 'LICENSE-MBN2OM3Q';

    // Get sample data with week and day
    const { data, error } = await supabase
        .from('company_uploaded_data')
        .select('week_number, day_name, branch_name, route_name')
        .eq('company_id', companyId)
        .eq('branch_name', 'JEDDAH CONSUMER')
        .not('week_number', 'is', null)
        .limit(20);

    if (error) {
        console.error("Error:", error);
        return;
    }

    console.log('Sample data with week/day:');
    console.log(JSON.stringify(data, null, 2));

    // Get distinct weeks
    const { data: weeksData } = await supabase
        .from('company_uploaded_data')
        .select('week_number')
        .eq('company_id', companyId)
        .eq('branch_name', 'JEDDAH CONSUMER');

    const distinctWeeks = Array.from(new Set(weeksData?.map(d => d.week_number).filter(Boolean)));
    console.log('\nDistinct week_number values:', distinctWeeks);

    // Get distinct days
    const { data: daysData } = await supabase
        .from('company_uploaded_data')
        .select('day_name')
        .eq('company_id', companyId)
        .eq('branch_name', 'JEDDAH CONSUMER');

    const distinctDays = Array.from(new Set(daysData?.map(d => d.day_name).filter(Boolean)));
    console.log('Distinct day_name values:', distinctDays);

    // Test the exact filter
    console.log('\n--- Testing exact filter query ---');
    const testQuery = await supabase
        .from('company_uploaded_data')
        .select('*')
        .eq('company_id', companyId)
        .eq('branch_name', 'JEDDAH CONSUMER')
        .eq('route_name', '15621 - ABODAH SAAD ALLATAH')
        .limit(5);

    console.log('Query WITHOUT week/day filter returned:', testQuery.data?.length, 'rows');

    // Test with week 4
    const testWithWeek = await supabase
        .from('company_uploaded_data')
        .select('*')
        .eq('company_id', companyId)
        .eq('branch_name', 'JEDDAH CONSUMER')
        .eq('route_name', '15621 - ABODAH SAAD ALLATAH')
        .eq('week_number', '4')
        .limit(5);

    console.log('Query WITH week_number=4 returned:', testWithWeek.data?.length, 'rows');

    // Test with Sunday
    const testWithDay = await supabase
        .from('company_uploaded_data')
        .select('*')
        .eq('company_id', companyId)
        .eq('branch_name', 'JEDDAH CONSUMER')
        .eq('route_name', '15621 - ABODAH SAAD ALLATAH')
        .eq('day_name', 'Sunday')
        .limit(5);

    console.log('Query WITH day_name=Sunday returned:', testWithDay.data?.length, 'rows');
}

checkWeekDay();
