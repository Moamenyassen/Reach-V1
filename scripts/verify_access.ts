
import { supabase } from '../services/supabase';
import * as dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env.local
// Note: services/supabase.ts might already be initializing the client, 
// but we need to ensure verify_access runs in Node environment correctly.
// We already patched supabase.ts to handle this!

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function verifyAccess() {
    console.log("Verifying access to 'reach_global_leads'...");

    // 1. Try to SELECT
    console.log("\n[READ TEST]");
    try {
        const { data, error, count } = await supabase
            .from('reach_global_leads')
            .select('*', { count: 'exact', head: true });

        if (error) {
            console.error("READ FAILED:", error.message, error.details);
        } else {
            console.log(`READ SUCCESS. Found ${count} records.`);
        }
    } catch (err) {
        console.error("READ EXCEPTION:", err);
    }

    // 2. Try to INSERT
    console.log("\n[WRITE TEST]");
    const dummyHash = `TEST_ACCESS_${Date.now()}`;
    const dummyRecord = {
        name: 'Access Test Company',
        lat: 0,
        lng: 0,
        region_description: 'Test Region',
        source_company_id: 'MANUAL_ENTRY',
        status: 'NEW',
        original_customer_hash: dummyHash
    };

    try {
        const { data, error } = await supabase
            .from('reach_global_leads')
            .insert([dummyRecord])
            .select();

        if (error) {
            console.error("WRITE FAILED:", error.message, error.details);
        } else {
            console.log("WRITE SUCCESS:", data);

            // Cleanup
            await supabase.from('reach_global_leads').delete().eq('original_customer_hash', dummyHash);
        }
    } catch (err) {
        console.error("WRITE EXCEPTION:", err);
    }
}

verifyAccess();
