
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    const { count: companyCount } = await supabase
        .from('company_uploaded_data')
        .select('*', { count: 'exact', head: true });

    const { count: customerCount } = await supabase
        .from('normalized_customers')
        .select('*', { count: 'exact', head: true });

    const { count: routeCount } = await supabase
        .from('routes')
        .select('*', { count: 'exact', head: true });

    console.log('--- DB STATS ---');
    console.log('company_uploaded_data count:', companyCount);
    console.log('normalized_customers count:', customerCount);
    console.log('routes count:', routeCount);
}

check();
