
import { getAllCompanies, fetchCompanyCustomers } from '../services/supabase';
import * as dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function verify() {
    console.log("Verifying fetch logic...");
    try {
        const companies = await getAllCompanies();
        console.log(`Found ${companies.length} companies.`);

        if (companies.length === 0) {
            console.log("No companies found.");
            return;
        }

        // Test with the first few companies
        const testLimit = 3;
        for (const company of companies.slice(0, testLimit)) {
            console.log(`\nTesting company: ${company.name} (${company.id})`);
            try {
                const customers = await fetchCompanyCustomers(company.id, (c, t) => {
                    if (c % 100 === 0) process.stdout.write('.');
                });
                console.log(`\n -> Found ${customers.length} customers.`);
            } catch (err) {
                console.error(` -> Failed to fetch:`, err);
            }
        }

    } catch (error) {
        console.error("Verification failed:", error);
    }
}

verify();
