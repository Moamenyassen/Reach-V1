import { createClient } from '@supabase/supabase-js';

// Credentials from verify_users_table.js
const sbUrl = 'https://mpkfvaccnsucdmxxtosu.supabase.co';
const sbKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1wa2Z2YWNjbnN1Y2RteHh0b3N1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc3NzQ3ODQsImV4cCI6MjA4MzM1MDc4NH0.dlfstdHCzWJF-CMCa93J4RsZvm2nwhqnE5hvZ_8pkEo';

const supabase = createClient(sbUrl, sbKey);

async function checkData() {
    console.log("Checking data...");

    // 1. Get a sample user (Non-Admin)
    const { data: users, error: userError } = await supabase
        .from('app_users')
        .select('username, role, branch_ids, route_ids')
        .neq('role', 'ADMIN')
        .limit(3);

    if (userError) console.error("Error fetching users:", userError);
    else {
        console.log("Sample Users (Non-Admin):");
        console.table(users);
    }

    // 2. Get Branches
    const { data: branches, error: branchError } = await supabase
        .from('company_branches')
        .select('id, code, name_en')
        .limit(5);

    if (branchError) console.error("Error fetching branches:", branchError);
    else {
        console.log("Sample Branches:");
        console.table(branches);
    }

    // 3. Compare
    if (users && users.length > 0 && branches && branches.length > 0) {
        const u = users[0];
        console.log("\n--- Analysis ---");
        console.log(`User: ${u.username}`);
        console.log(`User Branch IDs:`, u.branch_ids);

        if (u.branch_ids && u.branch_ids.length > 0) {
            const matchingBranchById = branches.find(b => u.branch_ids.includes(b.id));
            const matchingBranchByCode = branches.find(b => u.branch_ids.includes(b.code));

            if (matchingBranchById) console.log(`✓ Found match by ID: ${matchingBranchById.name_en} (${matchingBranchById.id})`);
            else console.log("✗ No match found by ID");

            if (matchingBranchByCode) console.log(`✓ Found match by Code: ${matchingBranchByCode.name_en} (${matchingBranchByCode.code})`);
            else console.log("✗ No match found by Code");
        } else {
            console.log("User has no branch_ids.");
        }
    }
}

checkData();
