import { createClient } from '@supabase/supabase-js';

// Hardcoded from services/supabase.ts backups/view
const SUPABASE_URL = 'https://mpkfvaccnsucdmxxtosu.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1wa2Z2YWNjbnN1Y2RteHh0b3N1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc3NzQ3ODQsImV4cCI6MjA4MzM1MDc4NH0.dlfstdHCzWJF-CMCa93J4RsZvm2nwhqnE5hvZ_8pkEo';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const getCompanyCustomerCounts = async () => {
    console.log("Starting count fetch...");
    try {
        // 1. Get all active versions
        const { data: metas, error: metaError } = await supabase
            .from('route_meta')
            .select('company_id, active_version_id');

        if (metaError) {
            console.error("Meta Error:", metaError);
            return {};
        }

        console.log("Metas found:", metas?.length);

        const stats = {};
        const activeVersions = metas?.map(m => m.active_version_id).filter(Boolean) || [];
        console.log("Active Versions:", activeVersions);

        if (activeVersions.length > 0) {
            // 2. Get counts from route_versions
            const { data: versions, error: vError } = await supabase
                .from('route_versions')
                .select('company_id, id, record_count')
                .in('id', activeVersions);

            if (vError) {
                console.error("Versions Error:", vError);
            } else {
                console.log("Versions found:", versions?.length);
                if (versions) {
                    versions.forEach((v) => {
                        const meta = metas?.find(m => m.company_id === v.company_id);
                        if (meta && meta.active_version_id === v.id) {
                            stats[v.company_id] = v.record_count || 0;
                        }
                    });
                }
            }
        }

        console.log("Final Stats:", stats);
        return stats;
    } catch (err) {
        console.error("Catastrophic Failure:", err);
    }
};

getCompanyCustomerCounts();
