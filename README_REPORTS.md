
# Detailed Reports Feature Setup Guide

The Detailed Reports feature requires a backend Express server and database updates. Follow these steps to get it running.

## 1. Database Setup

You must execute the SQL migration script in your Supabase project's SQL Editor.

- Copy the content of `db/migration_detailed_reports.sql`.
- Go to Supabase Dashboard -> SQL Editor.
- Paste and Run the script.
- **Note:** This script creates indexes and RPC functions required for the reports.

## 2. Backend Server Setup

The reports use a lightweight Express server to handle data aggregation and CSV exports.

1. Navigate to the server directory:

   ```bash
   cd server
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Start the server:

   ```bash
   node index.js
   ```

   The server will start on port **5001**.

   *Tip: Ensure your `.env` file in the root directory contains `SUPABASE_URL` and `SUPABASE_ANON_KEY` or `SUPABASE_SERVICE_KEY`. The server reads these.*

## 3. Frontend

The frontend has been updated to include the new Detailed Reports screen with 7 tabs.
Run the frontend as usual:

```bash
npm run dev
```

## Features Included

1. **Hierarchical View:** Drill down Branch -> Route -> User -> Week -> Day.
2. **Route Summary:** KPI cards and performance table with color coding.
3. **Visit Frequency:** Analysis of client visit patterns.
4. **Route Efficiency:** Optimization insights (GPS coverage, district spread).
5. **User Workload:** Sales rep workload analysis and chart.
6. **Data Quality:** Completeness scores for GPS, Phone, etc.
7. **Weekly Coverage:** Weekly service validation with visual indicators.

## Troubleshooting

- **CORS Error:** Ensure the server allows requests from your frontend URL (default `http://localhost:3000` or `http://localhost:5173`).
- **Data Not Loading:** Check if the RPC functions exist in Supabase. Check server console for errors.
- **Missing Filters:** Ensure the `company_uploaded_data` table has `branch_name`, `route_name`, etc. populated.
