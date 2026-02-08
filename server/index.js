require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const { createObjectCsvStringifier } = require('csv-writer');

const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(cors());
app.use(express.json());

// Supabase Configuration
// Using hardcoded values as fallback if env vars are missing, based on client-side config
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://mpkfvaccnsucdmxxtosu.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1wa2Z2YWNjbnN1Y2RteHh0b3N1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc3NzQ3ODQsImV4cCI6MjA4MzM1MDc4NH0.dlfstdHCzWJF-CMCa93J4RsZvm2nwhqnE5hvZ_8pkEo';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Helper to handle RPC calls
const callRpc = async (rpcName, params, res) => {
    try {
        const { data, error } = await supabase.rpc(rpcName, params);
        if (error) {
            console.error(`Error calling ${rpcName}:`, error);
            return res.status(500).json({ error: error.message });
        }
        res.json(data);
    } catch (err) {
        console.error(`Server Exception calling ${rpcName}:`, err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

// --- ROUTES ---

// 1. Filters (Simplified for now - can be expanded)
app.get('/api/reports/filters', async (req, res) => {
    try {
        const companyId = req.query.company_id;
        // Fetch distinct regions/branches
        const { data: branches, error } = await supabase
            .from('company_uploaded_data')
            .select('region, branch_code, branch_name')
            .eq('company_id', companyId); // Assuming company_id exists in table, user said it does in previous schema, but migration added it. 

        // Use a set to get unique
        // Note: Ideally use an RPC for distinct to be faster
        if (error) throw error;

        // Basic dedup
        const unique = [...new Set(branches.map(b => JSON.stringify(b)))].map(s => JSON.parse(s));
        res.json(unique);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 2. Tab 1: Hierarchical Data
app.get('/api/reports/hierarchical', (req, res) => {
    const { company_id, target_level, parent_id, branch_ids } = req.query;
    // Parse branch_ids if provided (comma-separated string)
    const branchIdsArray = branch_ids ? branch_ids.split(',').filter(Boolean) : null;

    console.log('[API] Hierarchical report request:', { company_id, target_level, parent_id, branch_ids: branchIdsArray });

    callRpc('get_hierarchical_report', {
        p_company_id: company_id,
        p_target_level: target_level || 'BRANCH',
        p_parent_id: parent_id || null,
        p_branch_ids: branchIdsArray
    }, res);
});

// 3. Tab 2: Route Summary
app.get('/api/reports/route-summary', (req, res) => {
    const { company_id, branch_ids } = req.query;
    const branchIdsArray = branch_ids ? branch_ids.split(',').filter(Boolean) : null;
    callRpc('get_route_summary_report', {
        p_company_id: company_id,
        p_branch_ids: branchIdsArray
    }, res);
});

// 4. Tab 3: Visit Frequency
app.get('/api/reports/visit-frequency', (req, res) => {
    const { company_id, limit, branch_ids } = req.query;
    const branchIdsArray = branch_ids ? branch_ids.split(',').filter(Boolean) : null;
    callRpc('get_visit_frequency_report', {
        p_company_id: company_id,
        p_limit: limit ? parseInt(limit) : 100,
        p_branch_ids: branchIdsArray
    }, res);
});

// 5. Tab 4: Route Efficiency
app.get('/api/reports/route-efficiency', (req, res) => {
    const { company_id, branch_ids } = req.query;
    const branchIdsArray = branch_ids ? branch_ids.split(',').filter(Boolean) : null;
    callRpc('get_route_efficiency_report', {
        p_company_id: company_id,
        p_branch_ids: branchIdsArray
    }, res);
});

// 6. Tab 5: User Workload
app.get('/api/reports/user-workload', (req, res) => {
    const { company_id, branch_ids } = req.query;
    const branchIdsArray = branch_ids ? branch_ids.split(',').filter(Boolean) : null;
    callRpc('get_user_workload_report', {
        p_company_id: company_id,
        p_branch_ids: branchIdsArray
    }, res);
});

// 7. Tab 6: Data Quality
app.get('/api/reports/data-quality', (req, res) => {
    const { company_id, branch_ids } = req.query;
    const branchIdsArray = branch_ids ? branch_ids.split(',').filter(Boolean) : null;
    callRpc('get_data_quality_report', {
        p_company_id: company_id,
        p_branch_ids: branchIdsArray
    }, res);
});

// 8. Tab 7: Weekly Coverage
app.get('/api/reports/weekly-coverage', (req, res) => {
    const { company_id, limit, branch_ids } = req.query;
    const branchIdsArray = branch_ids ? branch_ids.split(',').filter(Boolean) : null;
    callRpc('get_weekly_coverage_report', {
        p_company_id: company_id,
        p_limit: limit ? parseInt(limit) : 100,
        p_branch_ids: branchIdsArray
    }, res);
});

// 9. Export CSV
app.get('/api/reports/export', async (req, res) => {
    const { type, company_id } = req.query;

    let rpcName = '';
    let params = { p_company_id: company_id };

    switch (type) {
        case 'route-summary': rpcName = 'get_route_summary_report'; break;
        case 'visit-frequency': rpcName = 'get_visit_frequency_report'; break;
        case 'route-efficiency': rpcName = 'get_route_efficiency_report'; break;
        case 'user-workload': rpcName = 'get_user_workload_report'; break;
        case 'data-quality': rpcName = 'get_data_quality_report'; break;
        case 'weekly-coverage': rpcName = 'get_weekly_coverage_report'; break;
        default: return res.status(400).json({ error: 'Invalid export type' });
    }

    try {
        const { data, error } = await supabase.rpc(rpcName, params);
        if (error) throw error;

        if (!data || data.length === 0) {
            return res.send('');
        }

        const headers = Object.keys(data[0]).map(id => ({ id, title: id }));
        const csvStringifier = createObjectCsvStringifier({ header: headers });

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="report-${type}-${Date.now()}.csv"`);

        const headerString = csvStringifier.getHeaderString();
        const recordsString = csvStringifier.stringifyRecords(data);

        res.send(headerString + recordsString);

    } catch (err) {
        console.error('Export Error:', err);
        res.status(500).json({ error: err.message });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
