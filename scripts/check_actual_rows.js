import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://mpkfvaccnsucdmxxtosu.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1wa2Z2YWNjbnN1Y2RteHh0b3N1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc3NzQ3ODQsImV4cCI6MjA4MzM1MDc4NH0.dlfstdHCzWJF-CMCa93J4RsZvm2nwhqnE5hvZ_8pkEo';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const checkCustomers = async () => {
    console.log("Checking customers table...");
    try {
        const { data: metas } = await supabase.from('route_meta').select('*');
        console.log("Meta:", metas);

        if (metas && metas.length > 0) {
            const meta = metas[0];
            const { count, error } = await supabase
                .from('customers')
                .select('*', { count: 'exact', head: true })
                .eq('version_id', meta.active_version_id);

            if (error) {
                console.error("Error counting customers:", error);
            } else {
                console.log(`Version ${meta.active_version_id} has ${count} rows in 'customers' table.`);
            }

            // Also check first few rows to see schema
            const { data: rows } = await supabase
                .from('customers')
                .select('*')
                .eq('version_id', meta.active_version_id)
                .limit(5);

            console.log("Sample Rows:", JSON.stringify(rows, null, 2));
        }
    } catch (err) {
        console.error(err);
    }
};

checkCustomers();
