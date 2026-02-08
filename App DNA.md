# REACH AI: THE APP DNA (V2 - Deep Technical Deep Dive)

This document serves as the absolute source of truth for the technical architecture, logic flows, and security infrastructure of Reach AI.

---

## 1. CORE ARCHITECTURE & STATE

### 1.1 View Orchestration

The application uses a **View-Based SPA Architecture**. The primary entry point `App.tsx` manages global authentication and company context, while `AppContent.tsx` acts as the **View Orchestrator**.

* **View Switching**: A `ViewMode` enum controls which high-level component is rendered (Insights, Route Sequence, AI Optimizer, etc.).
* **Limbo State**: A specialized state for users without a company association, forcing them into a "Setup Required" or "Pricing" flow.

### 1.2 Data Synchronicity

Reach AI employs a **Hybrid Data Fetching Model**:

1. **Direct RLS Queries**: standard table fetches scoped by `company_id`.
2. **RPC Aggregates**: Complex analytical data (Dashboards) is fetched via Postgres Functions (`rpc`) to minimize client-side processing.
3. **Real-time Subscriptions**: Using Supabase Realtime to keep UI in sync across different devices/browsers.

---

## 2. THE DATA INGESTION ENGINE (ETL)

The ETL pipeline (found in `etlService.ts`) is a mission-critical 5-step atomic process designed for high-fidelity data normalization.

### 2.1 The 5-Step Pipeline

1. **Raw Backup (`Step 0`)**: Every row is backed up to `company_uploaded_data` with a unique `upload_batch_id`. This ensures data recovery if transformation fails.
2. **Branch Extraction (`Step 1`)**: Extracts unique branch codes and upserts them to `company_branches`.
3. **Route Mapping (`Step 2`)**: Extracts unique route names, linking them to branches.
4. **Customer Normalization (`Step 3`)**: Maps customers, handling missing information (like generating client codes from names if missing) and normalizing GPS coordinates.
5. **Visit Scheduling (`Step 4`)**: Generates the final schedule linkages between routes, customers, and days.

### 2.2 Rollback & Reliability

* **Transactional Integrity**: If any step fails, the `rollbackUpload` function uses the `upload_batch_id` to purge raw data and cascades deletions across normalized tables.
* **Nuclear Rollback**: A specialized `clearNormalizedData` function allows a company to completely wipe its operational data for a fresh start.

---

## 3. LOGIC & ALGORITHMS

### 3.1 Smart Travel Estimator

The system calculates travel time using more than just straight-line distance.

* **Haversine Formula**: Precise Earth-curvature distance calculation.
* **Segment Speed Heuristics**:
  * `< 2km`: Urban/Residential (20km/h cap).
  * `2km - 10km`: City Arterials (40km/h).
  * `> 10km`: Highway/Open Road (75km/h).
* **Urban Density Penalty**: Short segments (< 5km) receive a forced 30% traffic overhead multiplier.

### 3.2 Performance Algorithms

* **Sort & Sweep (O(N log N))**: Used for detecting "Nearby Customers" and "Same Location" pairs without performing a nested O(N²) distance check. It sorts by Latitude and sweeps only the relevant coordinate windows.
* **Nearest Neighbor TSP**: A greedy heuristic for initial route sequencing, optimized with bounding-box checks for large datasets.

### 3.3 AI Optimization Engine (Gemini)

The AI doesn't just "talk"; it analyzes structured metrics.

* **Driver Briefing**: Processes route metadata to identify safety risks and arrival timing recommendations.
* **Efficiency Coaching**: Uses a "Thinking Budget" to find root causes for low efficiency, comparing current performance against a 90% target baseline.

---

## 4. SECURITY & PERMISSIONS

### 4.1 Hybrid RLS Model

The database uses a custom `get_current_company_id()` function to support dual-authentication paths:

1. **Auth Path**: Retrieves `company_id` directly from the authenticated `app_users` entry via `auth.uid()`.
2. **Legacy Header Path**: For specific administrative or legacy flows, it extracts `x-company-id` from the HTTP request headers.

### 4.2 Policy Enforcement

* **Strict Isolation**: RLS is enabled on all tables. Policies like `Hybrid Isolation Customers` ensure that data is only visible if `company_id` matches the user's context.
* **Cascade Protection**: Foreign keys are used to enforce that data remains consistent across the normalized schema.

---

## 5. UI/UX DESIGN SYSTEM

### 5.1 Design Tokens

* **Aesthetics**: The app follows a "Premium Glassmorphism" style.
* **Themes**: Managed via `BrandThemeContext`, supporting dynamic toggles for Dark/Light mode and "AI Theme" (which activates vibrant gradients and pulsing visuals).

### 5.2 Map Visualizer Layers

The map engine is a customized Leaflet implementation featuring:

* **Interactive Layers**: Toggles between OSM Street View, Satellite, Dark (CARTO), and Light maps.
* **Dynamic Pulsing markers**: CSS animations (`pulse-ring`, `pulse-bounce`) for selected or highlighted customers.
* **Route Geometry**: Polyline rendering with custom dash arrays and stroke weighting.

---

## 6. EXTENDED DATABASE SCHEMA

| Table | Category | Purpose |
| :--- | :--- | :--- |
| `companies` | Admin | Multi-tenant organization roots. |
| `app_users` | Admin | User identities and roles (SYS_ADMIN, ADMIN, MANAGER, USER). |
| `company_uploaded_data` | Storage | Raw raw CSV backups with batch IDs. |
| `company_branches` | Operational | Regional centers/depots. |
| `routes` | Operational | Vehicle/Driver paths. |
| `normalized_customers` | Operational | De-duplicated customer master data. |
| `route_visits` | Operational | The "Junction" table defining the schedule. |
| `history_logs` | Audit | Detailed tracking of all data changes and uploads. |
