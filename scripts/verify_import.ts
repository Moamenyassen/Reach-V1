
import { supabase, fetchCompanyCustomers, insertGlobalLeadsSmart, getGlobalReachLeads, deleteAllGlobalReachLeads } from '../services/supabase';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function verifyImport() {
    console.log("Verifying Import Pipeline...");

    // 1. Find a company with data
    const { data: companies } = await supabase.from('companies').select('id, name');
    if (!companies || companies.length === 0) {
        console.error("No companies found.");
        return;
    }

    // Try to find known good company or just first one
    const targetCompany = companies.find(c => c.name.toLowerCase().includes('nsl')) || companies[0];
    console.log(`Targeting Company: ${targetCompany.name} (${targetCompany.id})`);

    // 2. Fetch Customers (using our fixed logic)
    console.log("Fetching customers...");
    const customers = await fetchCompanyCustomers(targetCompany.id);
    console.log(`Fetched ${customers.length} customers.`);

    if (customers.length === 0) {
        console.error("Fetch returned 0. Import cannot proceed.");
        return;
    }

    // 3. Take a sample to insert
    const sample = customers.slice(0, 5);
    console.log(`Attempting to insert ${sample.length} sample records...`);

    try {
        const result = await insertGlobalLeadsSmart(sample, (p) => process.stdout.write(`Progress: ${p}%\r`));
        console.log(`\nImport Result:`, result);

        // 4. Verify they exist in DB
        const { count } = await getGlobalReachLeads(1, 10);
        console.log(`Total Leads in DB now: ${count}`);

        if (count && count >= result.added) {
            console.log("SUCCESS: Data persisted.");

            // Cleanup
            console.log("Cleaning up...");
            await deleteAllGlobalReachLeads();
        } else {
            console.error("FAILURE: Data not found in DB after success result.");
        }

    } catch (err) {
        console.error("Import Exception:", err);
    }
}

verifyImport();
