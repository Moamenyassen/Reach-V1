import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://mpkfvaccnsucdmxxtosu.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1wa2Z2YWNjbnN1Y2RteHh0b3N1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc3NzQ3ODQsImV4cCI6MjA4MzM1MDc4NH0.dlfstdHCzWJF-CMCa93J4RsZvm2nwhqnE5hvZ_8pkEo';

const COMPANY_ID = 'LICENSE-CMWZNYGW';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
    global: {
        headers: {
            'x-company-id': COMPANY_ID
        }
    }
});

const checkSchema = async () => {
    console.log(`Checking schema for company ${COMPANY_ID}...`);
    try {
        const { data: samples, error } = await supabase
            .from('customers')
            .select('*')
            .limit(1);

        if (error) {
            console.error("Error fetching sample:", error);
        } else {
            console.log("Sample row (Full Schema):", JSON.stringify(samples?.[0], null, 2));
        }

    } catch (err) {
        console.error(err);
    }
};

checkSchema();
