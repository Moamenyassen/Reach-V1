import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://mpkfvaccnsucdmxxtosu.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1wa2Z2YWNjbnN1Y2RteHh0b3N1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc3NzQ3ODQsImV4cCI6MjA4MzM1MDc4NH0.dlfstdHCzWJF-CMCa93J4RsZvm2nwhqnE5hvZ_8pkEo';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkColumns() {
    console.log("Checking app_users columns...");
    // Try to select the new columns
    const { data, error } = await supabase
        .from('app_users')
        .select('route_ids, branch_ids, region_ids, rep_codes')
        .limit(1);

    if (error) {
        console.error("Error selecting columns:", error.message);
        if (error.message.includes("does not exist")) {
            console.log("CONFIRMED: Columns are missing.");
        }
    } else {
        console.log("Columns exist!");
        console.log("Data sample:", data);
    }
}

checkColumns();
