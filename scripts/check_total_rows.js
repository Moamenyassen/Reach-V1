import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://mpkfvaccnsucdmxxtosu.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1wa2Z2YWNjbnN1Y2RteHh0b3N1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc3NzQ3ODQsImV4cCI6MjA4MzM1MDc4NH0.dlfstdHCzWJF-CMCa93J4RsZvm2nwhqnE5hvZ_8pkEo';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const checkTotalCustomers = async () => {
    console.log("Checking total customers table...");
    try {
        const { count, error } = await supabase
            .from('customers')
            .select('*', { count: 'exact', head: true });

        if (error) {
            console.error("Error counting customers:", error);
        } else {
            console.log(`Total rows in 'customers' table: ${count}`);
        }

        const { data: samples } = await supabase.from('customers').select('id, company_id, version_id').limit(10);
        console.log("Sample rows (versions):", samples);

    } catch (err) {
        console.error(err);
    }
};

checkTotalCustomers();
